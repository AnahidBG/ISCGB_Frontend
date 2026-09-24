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
  documentosSinCargar,
  ultimaVersionPorTipo,
} from '../../../core/legajos/progreso-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { AccionPanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { notificacionesPorRechazos } from '../../../shared/ui/estructura-panel/notificaciones-legajo';
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
  imports: [EstructuraPanel, InsigniaEstado, DatePipe, ProgresoTramite, Icono, RouterLink],
  templateUrl: './panel-alumno.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAlumno {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;


  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */

  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly accion = ACCION_ALUMNO;

  protected readonly documentos = toSignal(this.legajoService.obtenerLegajoPropio(), {
    initialValue: [],
  });

  /**
   * Enciende el puntito rojo de la campana. Mismo criterio que
   * `PanelDocente.notificaciones`: un documento rechazado es algo que esta
   * persona tiene que resolver, los pendientes no (están en manos de
   * Secretaría). Antes esta pantalla no le pasaba ningún número a
   * `EstructuraPanel`, así que la campana nunca se encendía acá.
   */
  protected readonly notificaciones = computed(
    () => this.documentos().filter((documento) => documento.estado === 'Rechazado').length,
  );

  /** El detalle que se despliega al tocar la campana: qué le rechazaron y por qué. */
  protected readonly notificacionesDetalle = computed(() =>
    notificacionesPorRechazos(this.documentos(), { url: '/legajo/mis-documentos' }),
  );

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

  /** El detalle documento por documento del "Mapa del trámite" (`ProgresoTramite`). */
  protected readonly pasosTramite = computed<PasoTramite[]>(() => {
    const subidos: PasoTramite[] = ultimaVersionPorTipo(this.documentos()).map((documento) => ({
      nombre: documento.nombre,
      estado: documento.estado,
      faltante: false,
    }));

    const faltantes: PasoTramite[] = documentosSinCargar(
      this.documentos(),
      this.requeridos().filter((requerido) => requerido.obligatorio),
    ).map((requerido) => ({ nombre: requerido.nombreDocumento, estado: null, faltante: true }));

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

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
