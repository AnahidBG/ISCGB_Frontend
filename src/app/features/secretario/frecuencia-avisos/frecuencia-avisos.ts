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
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { textoFrecuencia } from '../../../core/notificaciones/frecuencia-avisos';
import {
  FrecuenciaAvisosService,
  MENSAJE_ERROR_FRECUENCIA,
} from '../../../core/notificaciones/frecuencia-avisos.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { FormularioFrecuencia } from './partes/formulario-frecuencia/formulario-frecuencia';

/** El pedido de la frecuencia vigente, con su fase (mismo criterio que `LegajoPropio`). */
type CargaFrecuencia =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; dias: number };

const CARGANDO: CargaFrecuencia = { fase: 'cargando' };

/**
 * Frecuencia de los avisos de documentación faltante (SCRUM-151).
 *
 * Secretaría elige cada cuántos días el sistema le recuerda por mail a cada
 * persona lo que le falta entregar. El envío lo hace un proceso del backend
 * que corre una vez por día; esta pantalla solo lee y guarda el número
 * (`GET` / `PUT /api/Configuracion/frecuencia-notificaciones`).
 *
 * Contenedor: es el único que conoce `FrecuenciaAvisosService`. El formulario
 * vive en `partes/formulario-frecuencia`.
 */
@Component({
  selector: 'app-frecuencia-avisos',
  imports: [EstructuraPanel, PantallaCarga, FormularioFrecuencia],
  templateUrl: './frecuencia-avisos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrecuenciaAvisos {
  private readonly auth = inject(AuthService);
  private readonly frecuencia = inject(FrecuenciaAvisosService);
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

  /** Cada `next` vuelve a pedir la frecuencia: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  /** La frecuencia que tiene guardada el servidor. Un fallo es una fase, no una excepción. */
  protected readonly carga = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() =>
        this.frecuencia.obtener().pipe(
          map((dias): CargaFrecuencia => ({ fase: 'listo', dias })),
          catchError((fallo: unknown) =>
            of<CargaFrecuencia>({
              fase: 'error',
              mensaje: fallo instanceof Error ? fallo.message : MENSAJE_ERROR_FRECUENCIA,
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
   * La frecuencia vigente. Sale del servidor y se pisa con lo que se guarda
   * acá, sin volver a pedirla: por eso `linkedSignal` y no `computed`.
   */
  protected readonly diasActuales = linkedSignal<number | null>(() => {
    const carga = this.carga();
    return carga.fase === 'listo' ? carga.dias : null;
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

  protected guardar(dias: number): void {
    this.guardando.set(true);
    this.errorGuardado.set(null);
    this.confirmacion.set(null);

    this.frecuencia
      .guardar(dias)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.diasActuales.set(dias);
          this.confirmacion.set(`Listo: los avisos se van a enviar ${textoFrecuencia(dias)}.`);
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
