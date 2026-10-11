import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { OpcionesPedido } from '../../../core/comun/opciones-pedido';
import {
  MesCalendario,
  mesAnterior,
  mesDe,
  mesSiguiente,
  semanasDelMes,
  tituloDelMes,
} from '../../../core/examenes/calendario-mes';
import { ExamenesService, MENSAJE_ERROR_CALENDARIO } from '../../../core/examenes/examenes.service';
import { EstadoMes } from '../../../core/examenes/modelos/estado-mes';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { Boton } from '../../../shared/ui/boton/boton';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { CabeceraMes } from './partes/cabecera-mes/cabecera-mes';
import { CalendarioMes } from './partes/calendario-mes/calendario-mes';

/**
 * El pedido de un mes, con su fase (mismo criterio que `CargaFrecuencia`).
 *
 * `listo` guarda el mes al que pertenecen los datos: el título de arriba cambia
 * apenas se toca una flecha, pero la grilla sigue siendo la del mes que llegó.
 */
type CargaMes =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; mes: MesCalendario; estado: EstadoMes };

const CARGANDO: CargaMes = { fase: 'cargando' };

/**
 * La pantalla ya muestra su propia espera dentro de la tarjeta: al pasar de mes
 * no tiene que taparse todo con el velo global.
 */
const EN_SEGUNDO_PLANO: OpcionesPedido = { enSegundoPlano: true };

/**
 * Calendario de exámenes parciales (SCRUM-183): consulta.
 *
 * Muestra un mes a la vez, con el estado de cada día: libre, con exámenes o
 * completo. El límite de exámenes por día es uno solo, para todo el instituto, y
 * lo define Secretaría. Lo ven los cuatro roles igual (`GET
 * /api/ConfiguracionCalendario/estado-mes`). Registrar, modificar o eliminar
 * exámenes no está en esta pantalla.
 *
 * Contenedor: es el único que conoce `ExamenesService`. El encabezado de la
 * tarjeta y la grilla viven en `partes/`.
 */
@Component({
  selector: 'app-calendario-examenes',
  imports: [EstructuraPanel, PantallaCarga, Boton, CabeceraMes, CalendarioMes],
  templateUrl: './calendario-examenes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioExamenes {
  private readonly auth = inject(AuthService);
  private readonly examenes = inject(ExamenesService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** El día en que se abrió la pantalla. Lo usan "Hoy" y la marca de la grilla. */
  private readonly hoy = new Date();

  /**
   * El mes que se está viendo. Con `equal`, "Hoy" estando en el mes actual no
   * vuelve a pedir lo que ya está en pantalla.
   */
  protected readonly mes = signal<MesCalendario>(mesDe(this.hoy), {
    equal: (a, b) => a.anio === b.anio && a.mes === b.mes,
  });

  protected readonly titulo = computed(() => tituloDelMes(this.mes()));

  /** Cada `next` vuelve a pedir el mes: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  /**
   * El estado del mes que se está viendo. Pasar de mes o reintentar lo vuelve a
   * pedir; `switchMap` descarta la respuesta de un mes que ya no se mira. Un fallo
   * es una fase, no una excepción.
   */
  protected readonly carga = toSignal(
    combineLatest([toObservable(this.mes), this.reintento.pipe(startWith(undefined))]).pipe(
      switchMap(([mes]) =>
        this.examenes.estadoDelMes(mes.anio, mes.mes, EN_SEGUNDO_PLANO).pipe(
          map((estado): CargaMes => ({ fase: 'listo', mes, estado })),
          catchError((fallo: unknown) =>
            of<CargaMes>({
              fase: 'error',
              mensaje: fallo instanceof Error ? fallo.message : MENSAJE_ERROR_CALENDARIO,
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

  /** Lo que dibuja la grilla, una vez que llegaron los datos del mes. */
  protected readonly calendario = computed(() => {
    const carga = this.carga();
    if (carga.fase !== 'listo') {
      return null;
    }
    return {
      titulo: tituloDelMes(carga.mes),
      limiteDiario: carga.estado.limiteDiario,
      semanas: semanasDelMes(carga.mes, carga.estado.diasOcupados, this.hoy),
    };
  });

  constructor() {
    this.campana.refrescar();
  }

  protected irAlMesAnterior(): void {
    this.mes.update(mesAnterior);
  }

  protected irAlMesSiguiente(): void {
    this.mes.update(mesSiguiente);
  }

  protected irAHoy(): void {
    this.mes.set(mesDe(this.hoy));
  }

  protected recargar(): void {
    this.reintento.next();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
