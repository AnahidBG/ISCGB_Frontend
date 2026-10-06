import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import {
  calcularProgresoLegajo,
  obligatoriosSinCargar,
  ultimaVersionPorTipo,
} from '../../../core/legajos/progreso-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { AccionPanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { novedadesDelLegajo } from '../../../core/notificaciones/notificaciones-legajo';
import { DocumentacionPorEntregar } from '../../../shared/ui/documentacion-por-entregar/documentacion-por-entregar';
import { Icono } from '../../../shared/ui/icono/icono';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';
import { PasoTramite, ProgresoTramite } from '../../../shared/ui/progreso-tramite/progreso-tramite';

const ACCION_ALUMNO: AccionPanel = {
  etiqueta: 'Nuevo Documento',
  url: '/legajo/subir-documento',
  icono: 'subir',
};

/**
 * Panel del Alumno.
 *
 * Muestra el legajo propio y el progreso de entrega ("Módulo de Salida",
 * ISCGB-PROJECT.md), y los accesos de autogestión estudiantil del Sprint 2:
 * certificado de alumno regular (con y sin horario), reconocimiento de
 * saberes y justificar inasistencia. El enlace a SIAADE es del Sprint 3 y
 * todavía no tiene URL definida con el instituto, así que no se inventa un
 * botón que no lleva a ningún lado.
 *
 * El legajo es real: sale de `GET /api/Legajos/usuario/{id}`.
 */
@Component({
  selector: 'app-panel-alumno',
  imports: [
    EstructuraPanel,
    InsigniaEstado,
    DatePipe,
    ProgresoTramite,
    Icono,
    RouterLink,
    DocumentacionPorEntregar,
  ],
  templateUrl: './panel-alumno.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAlumno {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */

  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
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

  /**
   * La campana del encabezado sale de `CampanaService`, igual en todas las
   * pantallas (SCRUM-7). Esta pantalla ya NO la calcula.
   */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /**
   * Las novedades del legajo con los datos que ESTA pantalla ya tiene. Se
   * siguen calculando acá (aunque la campana salga del servicio) porque el
   * cartel de "legajo completo" no puede depender de que la campana ya haya
   * cargado: vacía, `every` daría `true` y avisaría un completo falso.
   */
  private readonly novedades = computed(() =>
    novedadesDelLegajo(this.documentos(), this.requeridos()),
  );

  /** Todo lo obligatorio aprobado, sin rechazos pendientes (SCRUM-153). */
  protected readonly legajoCompleto = computed(
    () =>
      !this.progreso().estimado &&
      this.progreso().porcentaje === 100 &&
      this.novedades().detalle.every((novedad) => novedad.tono === 'aprobado'),
  );

  /** Lo obligatorio que nunca se subió (SCRUM-150). Ver `PanelDocente`. */
  protected readonly porEntregar = computed(() =>
    obligatoriosSinCargar(this.documentos(), this.requeridos()),
  );

  /** El detalle documento por documento del "Mapa del trámite" (`ProgresoTramite`). */
  protected readonly pasosTramite = computed<PasoTramite[]>(() => {
    const subidos: PasoTramite[] = ultimaVersionPorTipo(this.documentos()).map((documento) => ({
      nombre: documento.nombre,
      estado: documento.estado,
      faltante: false,
    }));

    const faltantes: PasoTramite[] = this.porEntregar().map((requerido) => ({
      nombre: requerido.nombreDocumento,
      estado: null,
      faltante: true,
    }));

    return [...subidos, ...faltantes];
  });

  /**
   * `true` con el desplegable de "Solicitar certificado" abierto.
   *
   * Un solo botón que despliega las dos variantes, en vez de mostrar los dos
   * enlaces siempre visibles: así lo pidió el equipo (decisión de UX del
   * 23/09/2026, discutida con Secretaría).
   */
  protected readonly certificadoDesplegado = signal(false);

  protected alternarCertificado(): void {
    this.certificadoDesplegado.update((valor) => !valor);
  }

  constructor() {
    // La campana es la misma en todas las pantallas: se pide al entrar.
    this.campana.refrescar();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
