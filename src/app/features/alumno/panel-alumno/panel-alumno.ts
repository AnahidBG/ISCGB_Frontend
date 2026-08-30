import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { calcularProgresoLegajo } from '../../../core/legajos/progreso-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { ENLACES_COMUNES } from '../../../shared/ui/estructura-panel/enlaces-comunes';
import {
  AccionPanel,
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';

const ENLACES_ALUMNO: EnlacePanel[] = [
  { etiqueta: 'Dashboard', url: '/alumno/panel', icono: 'panel' },
  { etiqueta: 'Subir Documento', url: '/legajo/subir-documento', icono: 'subir' },
  ...ENLACES_COMUNES,
];

const ACCION_ALUMNO: AccionPanel = {
  etiqueta: 'Nuevo Documento',
  url: '/legajo/subir-documento',
  icono: 'subir',
};

/**
 * Panel del Alumno.
 *
 * Muestra el legajo propio y el progreso de entrega ("Módulo de Salida",
 * ISCGB-PROJECT.md). El resto de lo que le corresponde a Alumno —
 * justificativos de inasistencia, solicitud de reconocimiento de saberes,
 * enlace al portal SIAADE — todavía no tiene pantalla propia ni endpoint,
 * así que no se inventa un botón que no lleva a ningún lado (mismo criterio
 * que se usó con "Solicitar acceso" en el login: si no hay a dónde
 * mandarlo, es peor que no tener el botón). Quedan listados como
 * pendientes en docs/alcance-paneles-roles.md.
 *
 * El legajo es real: sale de `GET /api/Legajos/usuario/{id}`.
 */
@Component({
  selector: 'app-panel-alumno',
  imports: [EstructuraPanel, InsigniaEstado, DatePipe],
  templateUrl: './panel-alumno.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAlumno {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly enlaces = ENLACES_ALUMNO;
  protected readonly accion = ACCION_ALUMNO;

  protected readonly documentos = toSignal(this.legajoService.obtenerLegajoPropio(), {
    initialValue: [],
  });

  /** El denominador del progreso. Ver el comentario en `PanelDocente`. */
  private readonly idRol = idRolDocumental(this.auth.sesion());

  protected readonly requeridos = toSignal(
    this.idRol === null
      ? of<DocumentoRequerido[]>([])
      : this.legajoService.documentosRequeridos(this.idRol),
    { initialValue: [] as DocumentoRequerido[] },
  );

  /** Misma fórmula que en `PanelDocente`: aprobados / obligatorios del rol. */
  protected readonly progreso = computed(() =>
    calcularProgresoLegajo(this.documentos(), this.requeridos()),
  );

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
