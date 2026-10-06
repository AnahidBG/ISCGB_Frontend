import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
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
import { rechazosVigentes } from '../../../core/legajos/rechazos-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { AccionPanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { AvisoLegajoCompleto } from '../../../shared/ui/aviso-legajo-completo/aviso-legajo-completo';
import { DocumentacionPorEntregar } from '../../../shared/ui/documentacion-por-entregar/documentacion-por-entregar';
import { DocumentosRechazados } from '../../../shared/ui/documentos-rechazados/documentos-rechazados';
import { Icono } from '../../../shared/ui/icono/icono';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';
import { PasoTramite, ProgresoTramite } from '../../../shared/ui/progreso-tramite/progreso-tramite';
import { TarjetaMetrica } from '../../../shared/ui/tarjeta-metrica/tarjeta-metrica';

const ACCION_DOCENTE: AccionPanel = {
  etiqueta: 'Nuevo Documento',
  url: '/legajo/subir-documento',
  icono: 'subir',
};

/** Un paso sugerido de la columna derecha del dashboard. */
interface ProximoPaso {
  tono: 'aprobado' | 'pendiente' | 'rechazado';
  titulo: string;
  detalle: string;
}

/**
 * Panel del Docente. Sigue la plantilla del dashboard de Figma: saludo,
 * cuatro tarjetas de resumen, actividad reciente y próximos pasos.
 *
 * Los documentos son reales: salen de `GET /api/Legajos/usuario/{id}`.
 */
@Component({
  selector: 'app-panel-docente',
  imports: [
    EstructuraPanel,
    InsigniaEstado,
    TarjetaMetrica,
    Icono,
    DatePipe,
    ProgresoTramite,
    DocumentacionPorEntregar,
    AvisoLegajoCompleto,
    DocumentosRechazados,
  ],
  templateUrl: './panel-docente.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDocente {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */

  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly accion = ACCION_DOCENTE;

  /**
   * El rol con el que se le piden documentos a esta persona.
   *
   * Se lee la sesión una sola vez, al construir el componente: quien está
   * mirando su propio panel no cambia de identidad mientras lo mira. Sin id
   * de rol (sesión del mock, o guardada de antes de que existiera
   * `rolesConId`) no se piden los requeridos y `calcularProgresoLegajo` cae
   * solo al cálculo estimado, que la pantalla avisa.
   */
  private readonly idRol = idRolDocumental(this.auth.sesion());

  /** Cada `next` vuelve a pedir el legajo: es el "Reintentar" de la tarjeta. */
  private readonly reintento = new Subject<void>();

  /**
   * El legajo propio y lo que le pide el instituto, con su fase de carga
   * (SCRUM-150). Un fallo llega como fase `error`, no como excepción: antes
   * un 500 rompía el panel entero al dibujar.
   */
  protected readonly legajo = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() => cargarLegajoPropio(this.legajoService, this.idRol)),
    ),
    { initialValue: LEGAJO_CARGANDO },
  );

  protected readonly documentos = computed(() => documentosDe(this.legajo()));

  /** Los documentos del rol: el DENOMINADOR del progreso. Sin esto solo se puede estimar. */
  protected readonly requeridos = computed(() => requeridosDe(this.legajo()));

  protected readonly errorLegajo = computed(() => errorDe(this.legajo()));

  /** Conteos sobre la versión VIGENTE de cada documento (un rechazo ya corregido no suma). */
  protected readonly resumen = computed(() => {
    const documentos = ultimaVersionPorTipo(this.documentos());
    return {
      total: documentos.length,
      aprobados: documentos.filter((d) => d.estado === 'Aprobado').length,
      pendientes: documentos.filter((d) => d.estado === 'Pendiente').length,
      rechazados: documentos.filter((d) => d.estado === 'Rechazado').length,
    };
  });

  /**
   * Los documentos más nuevos primero, que es lo que "Actividad reciente"
   * quiere decir. El backend los devuelve en el orden en que están en la
   * tabla, que no es ninguno en particular.
   */
  protected readonly actividadReciente = computed(() =>
    [...this.documentos()]
      .sort((a, b) => b.fechaSubida.getTime() - a.fechaSubida.getTime())
      .slice(0, 5),
  );

  /**
   * El progreso del legajo, con la fórmula del MVP: documentos aprobados
   * sobre los OBLIGATORIOS del rol (no sobre los que ya subió, que era el
   * cálculo optimista de antes — mostraba 100% con un solo documento
   * aprobado). Ver `calcularProgresoLegajo`, que es donde vive la fórmula y
   * está probada aparte.
   */
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
   * El cartel "¡Tu legajo está completo!" (SCRUM-153). Se decide con los
   * datos que ESTA pantalla ya tiene, no con la campana: el cartel no puede
   * depender de que la campana haya cargado. La condición es la misma que usa
   * el aviso de la campana: `legajoEstaCompleto`.
   */
  protected readonly legajoCompleto = computed(() =>
    legajoEstaCompleto(this.documentos(), this.requeridos()),
  );

  /**
   * Los rechazos que todavía hay que corregir (SCRUM-152): la tarjeta
   * "Documentación rechazada", con el motivo y el acceso para volver a subir.
   * Uno que ya se corrigió (se subió una versión nueva) no figura.
   */
  protected readonly rechazados = computed(() =>
    rechazosVigentes(this.documentos(), this.requeridos()),
  );

  /**
   * Lo obligatorio que nunca se subió (SCRUM-150): la tarjeta
   * "Documentación por entregar" y los "Sin cargar" del mapa del trámite.
   */
  protected readonly porEntregar = computed(() =>
    obligatoriosSinCargar(this.documentos(), this.requeridos()),
  );

  /**
   * Cuándo va la tarjeta "Documentación por entregar".
   *
   * Mientras carga o si falló va siempre: es la que lo dice. Con el legajo
   * listo no va si no se sabe qué le pide el instituto al rol (no podría
   * afirmar "no te falta nada") ni si el legajo está completo (ya lo dice el
   * cartel de arriba).
   */
  protected readonly mostrarPorEntregar = computed(
    () =>
      this.legajo().fase !== 'listo' || (!this.progreso().estimado && !this.legajoCompleto()),
  );

  /**
   * El detalle documento por documento del "Mapa del trámite"
   * (`ProgresoTramite`): los ya subidos (con su última versión, sin
   * duplicar por resubidas) más los que todavía faltan.
   */
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

  protected readonly proximosPasos = computed<ProximoPaso[]>(() => {
    const { total, aprobados, pendientes, rechazados } = this.resumen();
    const progreso = this.progreso();
    const pasos: ProximoPaso[] = [];

    // Lo que FALTA presentar. Solo se puede decir cuando sabemos qué le pide
    // el instituto a este rol: con el cálculo estimado, "faltan N" sería un
    // número inventado.
    const faltantes = progreso.total - progreso.aprobados;
    if (!progreso.estimado && faltantes > 0) {
      pasos.push({
        tono: 'pendiente',
        titulo: 'Documentación por completar',
        detalle: `Te ${faltantes === 1 ? 'falta' : 'faltan'} ${faltantes} de los ${progreso.total} documentos obligatorios de tu legajo.`,
      });
    }

    if (rechazados > 0) {
      pasos.push({
        tono: 'rechazado',
        titulo: 'Actualizar documentación',
        detalle: `${rechazados} ${rechazados === 1 ? 'documento fue rechazado' : 'documentos fueron rechazados'}. Revisá los comentarios de Secretaría y volvé a subirlos.`,
      });
    }

    if (pendientes > 0) {
      pasos.push({
        tono: 'pendiente',
        titulo: 'Esperando revisión',
        detalle: `${pendientes} ${pendientes === 1 ? 'documento está' : 'documentos están'} en manos de Secretaría. No hace falta que hagas nada.`,
      });
    }

    // "Al día" es tener el 100% de lo OBLIGATORIO, no "todo lo que subí está
    // aprobado": con el criterio viejo, alguien que subió un solo documento y
    // se lo aprobaron veía "Legajo al día" con siete documentos sin
    // presentar, justo al lado del paso que le dice que le faltan.
    if (total > 0 && aprobados === total && progreso.porcentaje === 100) {
      pasos.push({
        tono: 'aprobado',
        titulo: 'Legajo al día',
        detalle: progreso.estimado
          ? 'Todos los documentos que subiste están aprobados.'
          : 'Ya presentaste y te aprobaron toda la documentación obligatoria.',
      });
    }

    if (total === 0) {
      pasos.push({
        tono: 'pendiente',
        titulo: 'Todavía no subiste documentación',
        detalle: 'Cuando cargues tu primer documento va a aparecer acá.',
      });
    }

    return pasos;
  });

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
