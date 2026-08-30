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
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { AccionPanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';
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
  imports: [EstructuraPanel, InsigniaEstado, TarjetaMetrica, Icono, DatePipe],
  templateUrl: './panel-docente.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDocente {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly accion = ACCION_DOCENTE;

  protected readonly documentos = toSignal(this.legajoService.obtenerLegajoPropio(), {
    initialValue: [],
  });

  /**
   * Qué documentos le exige el instituto a esta persona por su rol. Es el
   * DENOMINADOR del progreso — sin esto solo se puede estimar.
   *
   * Se lee la sesión una sola vez, al construir el componente: quien está
   * mirando su propio panel no cambia de identidad mientras lo mira. Sin id
   * de rol (sesión del mock, o guardada de antes de que existiera
   * `rolesConId`) no se pide nada y `calcularProgresoLegajo` cae solo al
   * cálculo estimado, que la pantalla avisa.
   */
  private readonly idRol = idRolDocumental(this.auth.sesion());

  protected readonly requeridos = toSignal(
    this.idRol === null
      ? of<DocumentoRequerido[]>([])
      : this.legajoService.documentosRequeridos(this.idRol),
    { initialValue: [] as DocumentoRequerido[] },
  );

  protected readonly resumen = computed(() => {
    const documentos = this.documentos();
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
   * Lo que enciende el puntito rojo de la campana.
   *
   * Un documento rechazado es algo que esta persona tiene que resolver: hay
   * que volver a subirlo. Los pendientes no cuentan — están esperando a
   * Secretaría, no a ella, y avisar de algo sobre lo que no puede hacer nada
   * es entrenarla para ignorar la campana.
   */
  protected readonly notificaciones = computed(() => this.resumen().rechazados);

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

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
