import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  map,
  merge,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { OpcionesPedido } from '../../../core/comun/opciones-pedido';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_ELIMINAR_EXAMEN,
  MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
  MENSAJE_ERROR_REGISTRAR_EXAMEN,
  MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
} from '../../../core/examenes/calendario-examenes.service';
import {
  MesCalendario,
  mesAnterior,
  mesDe,
  mesSiguiente,
  textoDelLimite,
  tituloDelMes,
} from '../../../core/examenes/calendario-mes';
import { AvisoDelCalendario } from '../../../core/examenes/modelos/aviso-calendario';
import { CalendarioDelMes } from '../../../core/examenes/modelos/calendario-del-mes';
import { DiaCalendario } from '../../../core/examenes/modelos/dia-calendario';
import { ExamenCalendario } from '../../../core/examenes/modelos/examen-calendario';
import { NuevoExamen } from '../../../core/examenes/modelos/nuevo-examen';
import {
  avisoDeParcialEliminado,
  avisoDeParcialReprogramado,
} from '../../../core/examenes/modificacion-examen';
import {
  avisoDeFechaBloqueada,
  avisoDeParcialRegistrado,
  textoFechaYHora,
} from '../../../core/examenes/registro-examen';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { SiRol } from '../../../shared/directivas/si-rol/si-rol';
import { Boton } from '../../../shared/ui/boton/boton';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { AvisoCalendario } from './partes/aviso-calendario/aviso-calendario';
import { CabeceraMes } from './partes/cabecera-mes/cabecera-mes';
import { CambioDeParcial } from './partes/formulario-modificacion/formulario-modificacion';
import { GrillaCalendario, MovimientoDeExamen } from './partes/grilla-calendario/grilla-calendario';
import { LeyendaCalendario } from './partes/leyenda-calendario/leyenda-calendario';
import { ModificarParcial } from './partes/modificar-parcial/modificar-parcial';
import {
  CargaOpcionesDeRegistro,
  RegistroParcial,
} from './partes/registro-parcial/registro-parcial';
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

/** Un pedido del mes: cuál y si hace falta tapar la grilla con la espera mientras llega. */
interface PedidoDeMes {
  mes: MesCalendario;
  conEspera: boolean;
}

const CARGANDO: CargaMes = { fase: 'cargando' };
const OPCIONES_CARGANDO: CargaOpcionesDeRegistro = { fase: 'cargando' };

/** El título del aviso cuando el backend no deja mover un parcial arrastrado a otro día. */
const TITULO_PARCIAL_NO_MOVIDO = 'No se pudo mover el parcial';

/**
 * La pantalla ya muestra su propia espera dentro de la tarjeta: al pasar de mes
 * no tiene que taparse todo con el velo global. Lo mismo vale para el modal de
 * registro, que tiene la suya.
 */
const EN_SEGUNDO_PLANO: OpcionesPedido = { enSegundoPlano: true };

/**
 * Calendario de exámenes parciales (SCRUM-183): consulta, registro, reprogramación
 * y baja.
 *
 * Muestra un mes a la vez, con el estado de cada día: libre, con parciales o
 * completo. El límite de parciales es uno solo, para todo el instituto, y lo
 * define Secretaría. Lo ven el Docente, el Secretario y el Director (`GET
 * /api/ConfiguracionCalendario/estado-mes`); Secretario y Director además tienen
 * el enlace para cambiar el límite.
 *
 * El Docente además puede elegir un día disponible para registrar un parcial: se
 * abre el modal "Registrar parcial" (`POST /api/ConfiguracionCalendario/registrar`).
 * Si el backend lo rechaza (el día ya alcanzó el límite) su mensaje se muestra en
 * el formulario y el modal queda abierto para elegir otra fecha; si sale bien se
 * avisa y se vuelve a pedir el mes, sin tapar la grilla, para que el día cambie de
 * color. Un día completo, en cambio, no abre nada: explica arriba de la grilla que
 * la fecha está bloqueada (SCRUM-185).
 *
 * Con un parcial ya cargado (SCRUM-184) el Docente puede tocarlo, para abrir
 * "Modificar parcial" y cambiar su fecha y horario (`PUT .../modificar/{id}`) o
 * eliminarlo, con confirmación (`DELETE .../eliminar/{id}`), o arrastrarlo a otro
 * día con el mouse, que conserva el horario. Con la API real la grilla lista los
 * parciales del mes en curso (`GET .../del-mes`); en los otros meses solo se ve
 * el estado de cada día, porque el backend no los lista.
 *
 * Contenedor: es el único que conoce `CalendarioExamenesService`. El encabezado,
 * la leyenda, la grilla, lo de adentro de cada celda, los avisos y los modales
 * viven en `partes/`.
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
    AvisoCalendario,
    RegistroParcial,
    ModificarParcial,
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
  private readonly destruccion = inject(DestroyRef);
  private readonly injector = inject(Injector);

  /** La grilla, para devolverle el foco después de un cambio. Solo existe con el mes ya cargado. */
  private readonly grilla = viewChild(GrillaCalendario);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** Quiénes ven el enlace "Cambiar el límite": los que pueden fijarlo. */
  protected readonly rolesDelLimite = [ROLES.secretario, ROLES.director];

  /**
   * Quiénes pueden registrar, modificar y mover parciales: el Docente. Habilita
   * elegir un día y arrastrar un parcial en la grilla, y muestra el texto de ayuda.
   * Secretaría y Dirección solo miran.
   */
  protected readonly rolesQueRegistran = [ROLES.docente];
  protected readonly puedeRegistrar = computed(() =>
    tieneAlgunRol(this.sesion(), this.rolesQueRegistran),
  );

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
   * Cada `next` vuelve a pedir el mes SIN taparlo con la espera: la grilla queda
   * como está y solo se actualizan sus días. Lo usa el registro de un parcial, para
   * que el día cambie de color sin perder el lugar ni el foco.
   */
  private readonly actualizacion = new Subject<void>();

  /**
   * El mes que se está viendo: sus días y sus parciales. Pasar de mes, reintentar o
   * actualizar lo vuelve a pedir; `switchMap` descarta la respuesta de un mes que
   * ya no se mira. Un fallo es una fase, no una excepción.
   */
  protected readonly carga = toSignal(
    merge(
      combineLatest([toObservable(this.mes), this.reintento.pipe(startWith(undefined))]).pipe(
        map(([mes]): PedidoDeMes => ({ mes, conEspera: true })),
      ),
      this.actualizacion.pipe(map((): PedidoDeMes => ({ mes: this.mes(), conEspera: false }))),
    ).pipe(
      switchMap(({ mes, conEspera }) => {
        const pedido = combineLatest({
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
        );
        return conEspera ? pedido.pipe(startWith(CARGANDO)) : pedido;
      }),
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

  /** El día elegido para registrar un parcial, "2026-10-13", o `null` con el modal cerrado. */
  protected readonly diaARegistrar = signal<string | null>(null);

  /** Cada `next` pide las materias del docente y los tipos de examen: abrir el modal y "Reintentar". */
  private readonly pedidoDeOpciones = new Subject<void>();

  /**
   * Lo que necesita el formulario para dibujarse. Se pide al abrir el modal y no
   * antes: solo lo usa el Docente, y así siempre trae lo vigente. `switchMap`
   * descarta lo que llega de un pedido que ya no se espera.
   */
  protected readonly opciones = toSignal(
    this.pedidoDeOpciones.pipe(
      switchMap(() =>
        combineLatest({
          materias: this.servicio.materiasDelDocente(EN_SEGUNDO_PLANO),
          tipos: this.servicio.tiposDeExamen(EN_SEGUNDO_PLANO),
        }).pipe(
          map(({ materias, tipos }): CargaOpcionesDeRegistro => ({
            fase: 'listo',
            materias,
            tipos,
          })),
          catchError((fallo: unknown) =>
            of<CargaOpcionesDeRegistro>({
              fase: 'error',
              mensaje: fallo instanceof Error ? fallo.message : MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
            }),
          ),
          startWith(OPCIONES_CARGANDO),
        ),
      ),
    ),
    { initialValue: OPCIONES_CARGANDO },
  );

  protected readonly registrando = signal(false);

  /** Por qué el backend no registró el parcial, en sus palabras. Se muestra en el formulario. */
  protected readonly errorRegistro = signal<string | null>(null);

  /** El aviso de que el parcial quedó registrado, reprogramado o eliminado. */
  protected readonly aviso = signal<string | null>(null);

  /**
   * El aviso rojo de arriba de la grilla: una fecha bloqueada, o un parcial que el
   * backend no dejó mover. Se va al cambiar de mes y al abrir cualquier modal.
   */
  protected readonly alerta = signal<AvisoDelCalendario | null>(null);

  /** El parcial que se está modificando, tal como estaba al tocarlo, o `null` con el modal cerrado. */
  protected readonly parcialAModificar = signal<ExamenCalendario | null>(null);

  /** `true` mientras se reprograma o elimina un parcial. */
  protected readonly modificando = signal(false);

  /** Por qué el backend no reprogramó ni eliminó el parcial, en sus palabras. Va en el formulario. */
  protected readonly errorModificacion = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
  }

  protected irAlMesAnterior(): void {
    this.limpiarAvisos();
    this.mes.update(mesAnterior);
  }

  protected irAlMesSiguiente(): void {
    this.limpiarAvisos();
    this.mes.update(mesSiguiente);
  }

  protected irAHoy(): void {
    this.limpiarAvisos();
    this.mes.set(mesDe(this.hoy));
  }

  protected recargar(): void {
    this.reintento.next();
  }

  private limpiarAvisos(): void {
    this.aviso.set(null);
    this.alerta.set(null);
  }

  /** Explica por qué no se puede elegir un día completo, sin abrir nada. */
  protected mostrarFechaBloqueada(dia: DiaCalendario): void {
    this.aviso.set(null);
    this.alerta.set(avisoDeFechaBloqueada(dia.fecha, this.locale));
  }

  /** Abre el modal para registrar un parcial en el día elegido. */
  protected abrirRegistro(dia: DiaCalendario): void {
    this.limpiarAvisos();
    this.errorRegistro.set(null);
    this.diaARegistrar.set(dia.fecha);
    this.cargarOpciones();
  }

  protected cargarOpciones(): void {
    this.pedidoDeOpciones.next();
  }

  protected cerrarRegistro(): void {
    // Mientras se guarda no se cierra: se perdería la respuesta.
    if (!this.registrando()) {
      this.diaARegistrar.set(null);
    }
  }

  protected registrar(examen: NuevoExamen): void {
    if (this.registrando()) {
      return;
    }
    this.registrando.set(true);
    this.errorRegistro.set(null);

    this.servicio
      .registrarExamen(examen, EN_SEGUNDO_PLANO)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.registrando.set(false);
          this.diaARegistrar.set(null);
          this.aviso.set(avisoDeParcialRegistrado(examen.dia, examen.horario, this.locale));
          this.actualizacion.next();
        },
        error: (fallo: unknown) => {
          this.registrando.set(false);
          this.errorRegistro.set(
            fallo instanceof Error ? fallo.message : MENSAJE_ERROR_REGISTRAR_EXAMEN,
          );
        },
      });
  }

  /** Abre el modal para modificar o eliminar el parcial que se tocó. Es cosa del Docente. */
  protected abrirModificacion(examen: ExamenCalendario): void {
    if (!this.puedeRegistrar()) {
      return;
    }
    this.limpiarAvisos();
    this.errorModificacion.set(null);
    this.parcialAModificar.set(examen);
  }

  protected cerrarModificacion(): void {
    // Mientras se guarda no se cierra: se perdería la respuesta.
    if (!this.modificando()) {
      this.parcialAModificar.set(null);
    }
  }

  /** Cambia la fecha y el horario del parcial abierto. */
  protected reprogramar({ dia, horario }: CambioDeParcial): void {
    const examen = this.parcialAModificar();
    if (examen === null || this.modificando()) {
      return;
    }
    this.errorModificacion.set(null);

    this.cambiarParcial(
      this.servicio.reprogramarExamen(
        examen.idExamen,
        textoFechaYHora(dia, horario),
        EN_SEGUNDO_PLANO,
      ),
      MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
      {
        // Si pasó a otro mes, el foco vuelve al día donde estaba.
        alTerminar: () =>
          this.cerrarModificacionHecha(avisoDeParcialReprogramado(dia, horario, this.locale), [
            dia,
            examen.fecha,
          ]),
        alFallar: (mensaje) => this.errorModificacion.set(mensaje),
      },
    );
  }

  /** Elimina el parcial abierto. Ya se confirmó en el modal. */
  protected eliminar(): void {
    const examen = this.parcialAModificar();
    if (examen === null || this.modificando()) {
      return;
    }
    this.errorModificacion.set(null);

    this.cambiarParcial(
      this.servicio.eliminarExamen(examen.idExamen, EN_SEGUNDO_PLANO),
      MENSAJE_ERROR_ELIMINAR_EXAMEN,
      {
        alTerminar: () =>
          this.cerrarModificacionHecha(
            avisoDeParcialEliminado(examen.materia, examen.fecha, this.locale),
            [examen.fecha],
          ),
        alFallar: (mensaje) => this.errorModificacion.set(mensaje),
      },
    );
  }

  /**
   * Un parcial soltado en otro día de la grilla: se reprograma conservando su
   * horario. Si el backend lo rechaza (el día se completó mientras tanto), el
   * motivo va arriba de la grilla, que es donde la persona está mirando.
   */
  protected moverParcial({ examen, dia }: MovimientoDeExamen): void {
    if (!this.puedeRegistrar() || this.modificando()) {
      return;
    }
    this.limpiarAvisos();

    this.cambiarParcial(
      this.servicio.reprogramarExamen(
        examen.idExamen,
        textoFechaYHora(dia.fecha, examen.horario),
        EN_SEGUNDO_PLANO,
      ),
      MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
      {
        alTerminar: () =>
          this.aviso.set(avisoDeParcialReprogramado(dia.fecha, examen.horario, this.locale)),
        alFallar: (texto) => this.alerta.set({ titulo: TITULO_PARCIAL_NO_MOVIDO, texto }),
      },
    );
  }

  /**
   * Corre un cambio sobre un parcial. Mientras tanto no se acepta otro. Si sale
   * bien vuelve a pedir el mes sin taparlo, para que la grilla se actualice en su
   * lugar; si falla, se lo cuenta a quien lo pidió, con el mensaje del backend o
   * con `porDefecto`.
   */
  private cambiarParcial(
    pedido: Observable<void>,
    porDefecto: string,
    { alTerminar, alFallar }: { alTerminar: () => void; alFallar: (mensaje: string) => void },
  ): void {
    this.modificando.set(true);

    pedido.pipe(takeUntilDestroyed(this.destruccion)).subscribe({
      next: () => {
        this.modificando.set(false);
        alTerminar();
        this.actualizacion.next();
      },
      error: (fallo: unknown) => {
        this.modificando.set(false);
        alFallar(fallo instanceof Error ? fallo.message : porDefecto);
      },
    });
  }

  /**
   * Cierra el modal, avisa, y le devuelve el foco a la grilla: el botón del
   * parcial que lo tenía se mueve o desaparece. Prueba con cada fecha en orden y se
   * queda con la primera que sea de este mes.
   */
  private cerrarModificacionHecha(aviso: string, fechasParaElFoco: readonly string[]): void {
    this.parcialAModificar.set(null);
    this.aviso.set(aviso);

    afterNextRender(
      () => {
        fechasParaElFoco.some((fecha) => this.grilla()?.enfocarDia(fecha) ?? false);
      },
      { injector: this.injector },
    );
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
