import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  ExamenesService,
  MENSAJE_ERROR_LIMITE_DIARIO,
} from '../../../core/examenes/examenes.service';
import { textoLimiteDiario } from '../../../core/examenes/limite-diario';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { FormularioLimite } from './partes/formulario-limite/formulario-limite';

/** El pedido del límite vigente, con su fase (mismo criterio que `FrecuenciaAvisos`). */
type CargaLimite =
  { fase: 'cargando' } | { fase: 'error'; mensaje: string } | { fase: 'listo'; limite: number };

const CARGANDO: CargaLimite = { fase: 'cargando' };

/**
 * Límite de exámenes por día (calendario de exámenes, Sprint 3).
 *
 * Secretaría fija cuántos exámenes admite un mismo día. Es un solo número para
 * todo el instituto y para todos los tipos de examen: cuando un día lo alcanza,
 * el calendario lo muestra como Completo y el backend no deja registrar más. Esta
 * pantalla lee y guarda ese número (`estado-mes` / `PUT limite-parciales`).
 *
 * Contenedor: es el único que conoce `ExamenesService`. El formulario vive en
 * `partes/formulario-limite`.
 */
@Component({
  selector: 'app-limite-examenes',
  imports: [EstructuraPanel, PantallaCarga, FormularioLimite],
  templateUrl: './limite-examenes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LimiteExamenes {
  private readonly auth = inject(AuthService);
  private readonly examenes = inject(ExamenesService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** Cada `next` vuelve a pedir el límite: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  /** El límite que tiene guardado el servidor. Un fallo es una fase, no una excepción. */
  protected readonly carga = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() =>
        this.examenes.limiteDiario().pipe(
          map((limite): CargaLimite => ({ fase: 'listo', limite })),
          catchError((fallo: unknown) =>
            of<CargaLimite>({
              fase: 'error',
              mensaje: fallo instanceof Error ? fallo.message : MENSAJE_ERROR_LIMITE_DIARIO,
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
   * El límite vigente. Sale del servidor y se pisa con lo que se guarda acá,
   * sin volver a pedirlo: por eso `linkedSignal` y no `computed`.
   */
  protected readonly limiteActual = linkedSignal<number | null>(() => {
    const carga = this.carga();
    return carga.fase === 'listo' ? carga.limite : null;
  });

  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal<string | null>(null);
  protected readonly confirmacion = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
  }

  protected recargar(): void {
    this.reintento.next();
  }

  protected guardar(limite: number): void {
    this.guardando.set(true);
    this.errorGuardado.set(null);
    this.confirmacion.set(null);

    this.examenes
      .guardarLimiteDiario(limite)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.limiteActual.set(limite);
          this.confirmacion.set(`Límite actualizado: ${textoLimiteDiario(limite)}.`);
          this.guardando.set(false);
        },
        error: (fallo: Error) => {
          this.errorGuardado.set(fallo.message);
          this.guardando.set(false);
        },
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
