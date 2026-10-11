import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/modelos/rol';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { OpcionesPedido } from '../../../core/comun/opciones-pedido';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_CALENDARIO,
} from '../../../core/examenes/calendario-examenes.service';
import {
  MesCalendario,
  mesAnterior,
  mesDe,
  mesSiguiente,
  textoDelLimite,
  tituloDelMes,
} from '../../../core/examenes/calendario-mes';
import { CalendarioDelMes } from '../../../core/examenes/modelos/calendario-del-mes';
import { ExamenCalendario } from '../../../core/examenes/modelos/examen-calendario';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { SiRol } from '../../../shared/directivas/si-rol/si-rol';
import { Boton } from '../../../shared/ui/boton/boton';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { CabeceraMes } from './partes/cabecera-mes/cabecera-mes';
import { GrillaCalendario } from './partes/grilla-calendario/grilla-calendario';
import { LeyendaCalendario } from './partes/leyenda-calendario/leyenda-calendario';
import { ResumenDia } from './partes/resumen-dia/resumen-dia';

/**
 * El pedido de un mes, con su fase (mismo criterio que `CargaFrecuencia`).
 *
 * `listo` guarda el mes al que pertenecen los datos: el título de arriba cambia
 * apenas se toca una flecha, pero la grilla sigue siendo la del mes que llegó.
 */
type CargaMes =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | {
      fase: 'listo';
      mes: MesCalendario;
      calendario: CalendarioDelMes;
      examenes: ExamenCalendario[];
    };

const CARGANDO: CargaMes = { fase: 'cargando' };

/**
 * La pantalla ya muestra su propia espera dentro de la tarjeta: al pasar de mes
 * no tiene que taparse todo con el velo global.
 */
const EN_SEGUNDO_PLANO: OpcionesPedido = { enSegundoPlano: true };

/**
 * Calendario de exámenes parciales (SCRUM-183): consulta.
 *
 * Muestra un mes a la vez, con el estado de cada día: libre, con parciales o
 * completo. El límite de parciales es uno solo, para todo el instituto, y lo
 * define Secretaría. Lo ven el Docente, el Secretario y el Director (`GET
 * /api/ConfiguracionCalendario/estado-mes`); Secretario y Director además tienen
 * el enlace para cambiar el límite. Registrar, modificar o eliminar parciales no
 * está en esta pantalla.
 *
 * Contenedor: es el único que conoce `CalendarioExamenesService`. El encabezado,
 * la leyenda, la grilla y lo de adentro de cada celda viven en `partes/`.
 */
@Component({
  selector: 'app-calendario-examenes',
  imports: [
    EstructuraPanel,
    PantallaCarga,
    Boton,
    Icono,
    RouterLink,
    SiRol,
    CabeceraMes,
    LeyendaCalendario,
    GrillaCalendario,
    ResumenDia,
  ],
  templateUrl: './calendario-examenes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioExamenes {
  private readonly auth = inject(AuthService);
  private readonly servicio = inject(CalendarioExamenesService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** Quiénes ven el enlace "Cambiar el límite": los que pueden fijarlo. */
  protected readonly rolesDelLimite = [ROLES.secretario, ROLES.director];

  /** El día en que se abrió la pantalla. Lo usan "Hoy" y la marca de la grilla. */
  protected readonly hoy = new Date();

  /**
   * El mes que se está viendo. Con `equal`, "Hoy" estando en el mes actual no
   * vuelve a pedir lo que ya está en pantalla.
   */
  protected readonly mes = signal<MesCalendario>(mesDe(this.hoy), {
    equal: (a, b) => a.anio === b.anio && a.mes === b.mes,
  });

  protected readonly titulo = computed(() => tituloDelMes(this.mes(), this.locale));

  /** Cada `next` vuelve a pedir el mes: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  /**
   * El mes que se está viendo: sus días y sus parciales. Pasar de mes o
   * reintentar lo vuelve a pedir; `switchMap` descarta la respuesta de un mes que
   * ya no se mira. Un fallo es una fase, no una excepción.
   */
  protected readonly carga = toSignal(
    combineLatest([toObservable(this.mes), this.reintento.pipe(startWith(undefined))]).pipe(
      switchMap(([mes]) =>
        combineLatest({
          calendario: this.servicio.calendarioDelMes(mes.anio, mes.mes, EN_SEGUNDO_PLANO),
          examenes: this.servicio.examenesDelMes(mes.anio, mes.mes, EN_SEGUNDO_PLANO),
        }).pipe(
          map(({ calendario, examenes }): CargaMes => ({
            fase: 'listo',
            mes,
            calendario,
            examenes,
          })),
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
      mes: carga.mes,
      limite: carga.calendario.limite,
      dias: carga.calendario.dias,
      examenes: carga.examenes,
      textoLimite: textoDelLimite(carga.calendario.limite),
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
