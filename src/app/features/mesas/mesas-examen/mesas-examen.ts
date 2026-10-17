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
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CalendarioExamenesService } from '../../../core/examenes/calendario-examenes.service';
import { TipoExamen } from '../../../core/examenes/modelos/tipo-examen';
import { MateriasService } from '../../../core/materias/materias.service';
import {
  ComisionDisponible,
  DocenteDisponible,
} from '../../../core/materias/modelos/asignacion-materia';
import { MateriaDisponible } from '../../../core/materias/modelos/materia-disponible';
import { MesasExamenService } from '../../../core/mesas/mesas-examen.service';
import { NuevaMesa } from '../../../core/mesas/modelos/nueva-mesa';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { FormularioMesa } from './partes/formulario-mesa/formulario-mesa';

/** Las listas que necesita el alta de una mesa. */
interface OpcionesDeMesa {
  materias: MateriaDisponible[];
  comisiones: ComisionDisponible[];
  tipos: TipoExamen[];
  docentes: DocenteDisponible[];
}

/**
 * Mesas de examen — Dirección y Secretaría (SCRUM-245).
 *
 * CONTENEDOR: trae las materias, las comisiones y los docentes
 * (`MateriasService`) y los tipos de examen (`CalendarioExamenesService`), y
 * crea la mesa con `MesasExamenService` (`POST
 * /api/ConfiguracionCalendario/registrar-mesa`). El docente elegido queda
 * convocado en estado "Pendiente" y lo ve en "Mis mesas de examen".
 *
 * El formulario vive en `partes/formulario-mesa`.
 */
@Component({
  selector: 'app-mesas-examen',
  imports: [EstructuraPanel, PantallaCarga, FormularioMesa],
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

  constructor() {
    this.campana.refrescar();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    forkJoin({
      materias: this.materiasService.listarDisponibles(),
      comisiones: this.materiasService.listarComisiones(),
      docentes: this.materiasService.listarDocentes(),
      tipos: this.examenes.tiposDeExamen(),
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

    this.mesas
      .registrarMesa(mesa)
      .pipe(takeUntilDestroyed(this.destruccion))
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
