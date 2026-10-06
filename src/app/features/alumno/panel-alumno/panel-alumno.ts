import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import {
  LEGAJO_CARGANDO,
  cargarLegajoPropio,
  documentosDe,
  errorDe,
  requeridosDe,
} from '../../../core/legajos/legajo-propio';
import { LegajoService } from '../../../core/legajos/legajo.service';
import {
  calcularProgresoLegajo,
  legajoEstaCompleto,
  obligatoriosSinCargar,
  ultimaVersionPorTipo,
} from '../../../core/legajos/progreso-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { AccionPanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { AvisoLegajoCompleto } from '../../../shared/ui/aviso-legajo-completo/aviso-legajo-completo';
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
    AvisoLegajoCompleto,
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

  /** El rol con el que se le piden documentos. Ver el comentario en `PanelDocente`. */
  private readonly idRol = idRolDocumental(this.auth.sesion());

  /** Cada `next` vuelve a pedir el legajo: es el "Reintentar" de la tarjeta. */
  private readonly reintento = new Subject<void>();

  /**
   * El legajo propio y lo que le pide el instituto, con su fase de carga
   * (SCRUM-150). Un fallo llega como fase `error`, no como excepción.
   */
  protected readonly legajo = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() => cargarLegajoPropio(this.legajoService, this.idRol)),
    ),
    { initialValue: LEGAJO_CARGANDO },
  );

  protected readonly documentos = computed(() => documentosDe(this.legajo()));

  /** El denominador del progreso. Ver el comentario en `PanelDocente`. */
  protected readonly requeridos = computed(() => requeridosDe(this.legajo()));

  protected readonly errorLegajo = computed(() => errorDe(this.legajo()));

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

  /** El cartel "¡Tu legajo está completo!" (SCRUM-153). Ver `PanelDocente`. */
  protected readonly legajoCompleto = computed(() =>
    legajoEstaCompleto(this.documentos(), this.requeridos()),
  );

  /** Lo obligatorio que nunca se subió (SCRUM-150). Ver `PanelDocente`. */
  protected readonly porEntregar = computed(() =>
    obligatoriosSinCargar(this.documentos(), this.requeridos()),
  );

  /** Cuándo va la tarjeta "Documentación por entregar". Ver `PanelDocente`. */
  protected readonly mostrarPorEntregar = computed(
    () =>
      this.legajo().fase !== 'listo' || (!this.progreso().estimado && !this.legajoCompleto()),
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

  protected recargarLegajo(): void {
    this.reintento.next();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
