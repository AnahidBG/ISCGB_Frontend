import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { MateriasService } from '../../../core/materias/materias.service';
import {
  AsignacionMateria,
  ComisionDisponible,
  DocenteDisponible,
  NuevaMateria,
} from '../../../core/materias/modelos/asignacion-materia';
import { MateriaDisponible } from '../../../core/materias/modelos/materia-disponible';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { FormularioAsignacion } from './partes/formulario-asignacion/formulario-asignacion';
import { FormularioNuevaMateria } from './partes/formulario-nueva-materia/formulario-nueva-materia';

/**
 * Materias y asignaciones — Dirección y Secretaría (`AsignacionesController`).
 *
 * CONTENEDOR: trae materias, docentes y comisiones, y habla con
 * `MateriasService`. Los dos formularios viven en `partes/`.
 *
 *   · Nueva materia: `POST /api/Asignaciones/cargar-materia`. Al crearla se
 *     vuelve a pedir la lista, así ya se puede asignar.
 *   · Asignar: `POST /api/Asignaciones/asignar`. Es lo que después ve el
 *     docente en "Entregar programa de materia".
 *
 * ⚠️ El backend no tiene endpoint para LISTAR las asignaciones hechas ni para
 * borrarlas: la pantalla lo dice.
 */
@Component({
  selector: 'app-asignaciones',
  imports: [EstructuraPanel, PantallaCarga, FormularioNuevaMateria, FormularioAsignacion],
  templateUrl: './asignaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Asignaciones {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly materiasService = inject(MateriasService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly materias = signal<MateriaDisponible[]>([]);
  protected readonly docentes = signal<DocenteDisponible[]>([]);
  protected readonly comisiones = signal<ComisionDisponible[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly creandoMateria = signal(false);
  protected readonly errorMateria = signal<string | null>(null);
  protected readonly exitoMateria = signal<string | null>(null);
  protected readonly reinicioMateria = signal(0);

  protected readonly asignando = signal(false);
  protected readonly errorAsignacion = signal<string | null>(null);
  protected readonly exitoAsignacion = signal<string | null>(null);
  protected readonly reinicioAsignacion = signal(0);

  constructor() {
    this.campana.refrescar();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    forkJoin({
      materias: this.materiasService.listarDisponibles(),
      docentes: this.materiasService.listarDocentes(),
      comisiones: this.materiasService.listarComisiones(),
    }).subscribe({
      next: ({ materias, docentes, comisiones }) => {
        this.materias.set(materias);
        this.docentes.set(docentes);
        this.comisiones.set(comisiones);
        this.cargando.set(false);
      },
      error: (fallo: Error) => {
        this.errorCarga.set(fallo.message);
        this.cargando.set(false);
      },
    });
  }

  protected crearMateria(materia: NuevaMateria): void {
    if (this.creandoMateria()) {
      return;
    }
    this.creandoMateria.set(true);
    this.errorMateria.set(null);
    this.exitoMateria.set(null);

    this.materiasService.crearMateria(materia).subscribe({
      next: (mensaje) => {
        this.creandoMateria.set(false);
        this.exitoMateria.set(`${mensaje} "${materia.nombre}" ya se puede asignar.`);
        this.reinicioMateria.update((n) => n + 1);
        this.materiasService.listarDisponibles().subscribe({
          next: (materias) => this.materias.set(materias),
        });
      },
      error: (fallo: Error) => {
        this.creandoMateria.set(false);
        this.errorMateria.set(fallo.message);
      },
    });
  }

  protected asignar(asignacion: AsignacionMateria): void {
    if (this.asignando()) {
      return;
    }
    this.asignando.set(true);
    this.errorAsignacion.set(null);
    this.exitoAsignacion.set(null);

    this.materiasService.asignar(asignacion).subscribe({
      next: (mensaje) => {
        this.asignando.set(false);
        this.exitoAsignacion.set(mensaje);
        this.reinicioAsignacion.update((n) => n + 1);
      },
      error: (fallo: Error) => {
        this.asignando.set(false);
        this.errorAsignacion.set(fallo.message);
      },
    });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
