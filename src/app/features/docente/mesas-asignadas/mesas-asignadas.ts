import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_MESAS_ASIGNADAS,
} from '../../../core/examenes/calendario-examenes.service';
import { MesaAsignada } from '../../../core/examenes/modelos/mesa-asignada';
import { MesasExamenService } from '../../../core/mesas/mesas-examen.service';
import {
  confirmacionDeRespuesta,
  cuandoEsLaMesa,
  mesasPorResponder,
} from '../../../core/mesas/textos-mesas';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { DialogoConfirmacion } from '../../../shared/ui/dialogo-confirmacion/dialogo-confirmacion';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { ListaMesas } from './partes/lista-mesas/lista-mesas';

/** El pedido de las mesas, con su fase (mismo criterio que `FrecuenciaAvisos`). */
type CargaMesas =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; mesas: MesaAsignada[] };

const CARGANDO: CargaMesas = { fase: 'cargando' };

/**
 * Mis mesas de examen (SCRUM-246): el docente acepta o rechaza las mesas a las
 * que lo convocaron Dirección o Secretaría.
 *
 * Las mesas salen de `GET /api/Configuracion/mis-notificaciones`
 * (`CalendarioExamenesService.mesasAsignadas`), sin las de días que ya pasaron.
 * La respuesta va por `PUT /api/Docente/responder-asignacion`
 * (`MesasExamenService`). Rechazar pide confirmación: después no se puede
 * cambiar, y Dirección y Secretaría reciben la alerta para reasignar la mesa.
 *
 * Contenedor: es el único que conoce los servicios. La lista vive en
 * `partes/lista-mesas`.
 */
@Component({
  selector: 'app-mesas-asignadas',
  imports: [EstructuraPanel, PantallaCarga, ListaMesas, DialogoConfirmacion],
  templateUrl: './mesas-asignadas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesasAsignadas {
  private readonly auth = inject(AuthService);
  private readonly examenes = inject(CalendarioExamenesService);
  private readonly mesasExamen = inject(MesasExamenService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);
  private readonly locale = inject(LOCALE_ID);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** Cada `next` vuelve a pedir las mesas: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  protected readonly carga = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() =>
        this.examenes.mesasAsignadas().pipe(
          map((mesas): CargaMesas => ({ fase: 'listo', mesas: mesasPorResponder(mesas, new Date()) })),
          catchError((fallo: unknown) =>
            of<CargaMesas>({
              fase: 'error',
              mensaje: fallo instanceof Error ? fallo.message : MENSAJE_ERROR_MESAS_ASIGNADAS,
            }),
          ),
          startWith(CARGANDO),
        ),
      ),
    ),
    { initialValue: CARGANDO },
  );

  protected readonly errorCarga = computed(() => {
    const carga = this.carga();
    return carga.fase === 'error' ? carga.mensaje : null;
  });

  /**
   * Las mesas que siguen sin responder. Salen del servidor y pierden la que se
   * responde acá, sin volver a pedirlas: por eso `linkedSignal`.
   */
  protected readonly mesas = linkedSignal<MesaAsignada[]>(() => {
    const carga = this.carga();
    return carga.fase === 'listo' ? carga.mesas : [];
  });

  protected readonly respondiendo = signal<number | null>(null);
  protected readonly porRechazar = signal<MesaAsignada | null>(null);
  protected readonly confirmacion = signal<string | null>(null);
  protected readonly errorRespuesta = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
  }

  protected recargar(): void {
    this.reintento.next();
  }

  /** "viernes 20 de noviembre, 09:00 h", para el texto del diálogo. */
  protected cuando(mesa: MesaAsignada): string {
    return cuandoEsLaMesa(mesa.fecha, this.locale);
  }

  protected aceptar(mesa: MesaAsignada): void {
    this.responder(mesa, true);
  }

  /** Rechazar no tiene vuelta atrás: primero se confirma. */
  protected pedirRechazo(mesa: MesaAsignada): void {
    this.porRechazar.set(mesa);
  }

  protected confirmarRechazo(): void {
    const mesa = this.porRechazar();
    this.porRechazar.set(null);
    if (mesa !== null) {
      this.responder(mesa, false);
    }
  }

  protected cancelarRechazo(): void {
    this.porRechazar.set(null);
  }

  private responder(mesa: MesaAsignada, acepta: boolean): void {
    if (this.respondiendo() !== null) {
      return;
    }
    this.respondiendo.set(mesa.idExamen);
    this.errorRespuesta.set(null);
    this.confirmacion.set(null);

    this.mesasExamen
      .responderAsignacion(mesa.idExamen, acepta)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.mesas.update((mesas) => mesas.filter(({ idExamen }) => idExamen !== mesa.idExamen));
          this.confirmacion.set(confirmacionDeRespuesta(mesa, acepta, this.locale));
          this.respondiendo.set(null);
          // La mesa respondida deja de ser una novedad de la campana.
          this.campana.refrescar();
        },
        error: (fallo: Error) => {
          this.errorRespuesta.set(fallo.message);
          this.respondiendo.set(null);
        },
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
