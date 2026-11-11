import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CalendarioExamenesService } from '../../../core/examenes/calendario-examenes.service';
import { MateriasService } from '../../../core/materias/materias.service';
import { DocenteDisponible } from '../../../core/materias/modelos/asignacion-materia';
import { MateriaDisponible } from '../../../core/materias/modelos/materia-disponible';
import { MENSAJE_SIN_REVISAR_LUGAR, motivoSinLugar } from '../../../core/mesas/lugar-en-el-dia';
import { MesasExamenService } from '../../../core/mesas/mesas-examen.service';
import { AlertaRechazo } from '../../../core/mesas/modelos/alerta-rechazo';
import { NuevaMesa } from '../../../core/mesas/modelos/nueva-mesa';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import {
  AlertasRechazo,
  Reasignacion,
  claveDeAlerta,
} from './partes/alertas-rechazo/alertas-rechazo';
import { FormularioMesa } from './partes/formulario-mesa/formulario-mesa';

/**
 * Las listas que necesita el alta de una mesa. Sin comisiones ni tipos: la mesa
 * es para todas las comisiones de la materia y siempre "Mesa de Examen".
 */
interface OpcionesDeMesa {
  materias: MateriaDisponible[];
  docentes: DocenteDisponible[];
}

/**
 * Mesas de examen — Dirección y Secretaría (SCRUM-245 y SCRUM-247).
 *
 * CONTENEDOR: trae las materias y los docentes (`MateriasService`), revisa el
 * día con `CalendarioExamenesService` y habla con `MesasExamenService`:
 *
 *   · Nueva mesa: `POST /api/ConfiguracionCalendario/registrar-mesa` con el
 *     tribunal completo (presidente, vocal 1 y vocal 2). Los tres quedan
 *     convocados en "Pendiente" y la ven en "Mis mesas de examen"; la mesa
 *     aparece en el calendario cuando aceptan los tres.
 *     Antes se revisa el día con `calendarioDelMes` para todo el año de la
 *     materia (solo `idMateria`): la mesa ocupa un lugar en cada comisión, así
 *     que entra si ninguna llegó al límite (`motivoSinLugar`). El backend
 *     también lo valida y responde 400 con su motivo.
 *   · Mesas rechazadas: `GET /api/Configuracion/alertas-rechazos`. "Ya lo vi"
 *     archiva la alerta (`PUT .../ocultar-alerta-rechazo`). También se puede
 *     convocar a otro docente (`POST .../asignar-docente`), y entonces la alerta
 *     se archiva sola.
 *
 * Las alertas se cargan aparte: si fallan, el alta de mesas sigue andando.
 * El formulario y la lista de alertas viven en `partes/`.
 */
@Component({
  selector: 'app-mesas-examen',
  imports: [EstructuraPanel, PantallaCarga, FormularioMesa, AlertasRechazo],
  templateUrl: './mesas-examen.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MesasExamen {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly materiasService = inject(MateriasService);
  private readonly examenes = inject(CalendarioExamenesService);
  private readonly mesas = inject(MesasExamenService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly hoy = new Date();

  protected readonly opciones = signal<OpcionesDeMesa | null>(null);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly creando = signal(false);
  protected readonly errorMesa = signal<string | null>(null);
  protected readonly exitoMesa = signal<string | null>(null);
  protected readonly reinicioMesa = signal(0);

  protected readonly alertas = signal<AlertaRechazo[]>([]);
  protected readonly cargandoAlertas = signal(true);
  protected readonly errorCargaAlertas = signal<string | null>(null);

  /** La alerta que se está resolviendo (`claveDeAlerta`). */
  protected readonly procesandoAlerta = signal<string | null>(null);
  protected readonly errorAlertas = signal<string | null>(null);
  protected readonly exitoAlertas = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
    this.cargar();
    this.cargarAlertas();
  }

  protected cargarAlertas(): void {
    this.cargandoAlertas.set(true);
    this.errorCargaAlertas.set(null);
    this.mesas
      .alertasDeRechazo()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (alertas) => {
          this.alertas.set(alertas);
          this.cargandoAlertas.set(false);
        },
        error: (fallo: Error) => {
          this.errorCargaAlertas.set(fallo.message);
          this.cargandoAlertas.set(false);
        },
      });
  }

  protected archivarAlerta(alerta: AlertaRechazo): void {
    if (this.procesandoAlerta() !== null) {
      return;
    }
    this.empezarConAlerta(alerta);

    this.mesas
      .ocultarAlerta(alerta.idExamen, alerta.idDocente)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.quitarAlerta(alerta);
          this.exitoAlertas.set(`Archivaste el aviso de la mesa de ${alerta.materia}.`);
        },
        error: (fallo: Error) => this.fallarConAlerta(fallo),
      });
  }

  /**
   * Convoca a otro docente y, si sale bien, archiva la alerta: ya está resuelta.
   * Si la convocatoria sale pero el archivo no, se avisa para tocar "Ya lo vi".
   */
  protected reasignar({ alerta, idDocente, rol }: Reasignacion): void {
    if (this.procesandoAlerta() !== null) {
      return;
    }
    this.empezarConAlerta(alerta);

    this.mesas
      .asignarDocente(alerta.idExamen, idDocente, rol)
      .pipe(
        switchMap((mensaje) =>
          this.mesas.ocultarAlerta(alerta.idExamen, alerta.idDocente).pipe(
            map(() => ({ mensaje, archivada: true })),
            catchError(() => of({ mensaje, archivada: false })),
          ),
        ),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: ({ mensaje, archivada }) => {
          if (archivada) {
            this.quitarAlerta(alerta);
            this.exitoAlertas.set(mensaje);
          } else {
            this.procesandoAlerta.set(null);
            this.exitoAlertas.set(`${mensaje} No pudimos archivar el aviso: tocá "Ya lo vi".`);
          }
        },
        error: (fallo: Error) => this.fallarConAlerta(fallo),
      });
  }

  private empezarConAlerta(alerta: AlertaRechazo): void {
    this.procesandoAlerta.set(claveDeAlerta(alerta));
    this.errorAlertas.set(null);
    this.exitoAlertas.set(null);
  }

  private quitarAlerta(alerta: AlertaRechazo): void {
    const clave = claveDeAlerta(alerta);
    this.alertas.update((alertas) => alertas.filter((otra) => claveDeAlerta(otra) !== clave));
    this.procesandoAlerta.set(null);
    // La alerta resuelta deja de ser una novedad de la campana.
    this.campana.refrescar();
  }

  private fallarConAlerta(fallo: Error): void {
    this.errorAlertas.set(fallo.message);
    this.procesandoAlerta.set(null);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    forkJoin({
      materias: this.materiasService.listarDisponibles(),
      docentes: this.materiasService.listarDocentes(),
    })
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (opciones) => {
          this.opciones.set(opciones);
          this.cargando.set(false);
        },
        error: (fallo: Error) => {
          this.errorCarga.set(fallo.message);
          this.cargando.set(false);
        },
      });
  }

  protected crearMesa(mesa: NuevaMesa): void {
    if (this.creando()) {
      return;
    }
    this.creando.set(true);
    this.errorMesa.set(null);
    this.exitoMesa.set(null);

    // `dia` es "2026-11-20": de ahí salen el año y el mes que hay que revisar. La
    // mesa es de todo el año de la materia: se revisa sin comisión.
    const [anio, mes] = mesa.dia.split('-').map(Number);
    this.examenes
      .calendarioDelMes(anio, mes, undefined, { idMateria: mesa.idMateria })
      .pipe(
        catchError(() => throwError(() => new Error(MENSAJE_SIN_REVISAR_LUGAR))),
        switchMap((calendario) => {
          const motivo = motivoSinLugar(calendario, mesa.dia);
          return motivo === null
            ? this.mesas.registrarMesa(mesa)
            : throwError(() => new Error(motivo));
        }),
        takeUntilDestroyed(this.destruccion),
      )
      .subscribe({
        next: (mensaje) => {
          this.creando.set(false);
          this.exitoMesa.set(mensaje);
          this.reinicioMesa.update((n) => n + 1);
        },
        error: (fallo: Error) => {
          this.creando.set(false);
          this.errorMesa.set(fallo.message);
        },
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
