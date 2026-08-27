import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LegajoService } from '../../../core/legajos/legajo.service';
import {
  AccionPanel,
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';
import { TarjetaMetrica } from '../../../shared/ui/tarjeta-metrica/tarjeta-metrica';

const ENLACES_DOCENTE: EnlacePanel[] = [
  { etiqueta: 'Dashboard', url: '/docente/panel', icono: 'panel' },
  { etiqueta: 'Subir Documento', url: '/legajo/subir-documento', icono: 'subir' },
  { etiqueta: 'Entregar programa de materia', url: '/docente/entrega-programa', icono: 'legajo' },
];

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
  protected readonly enlaces = ENLACES_DOCENTE;
  protected readonly accion = ACCION_DOCENTE;

  protected readonly documentos = toSignal(this.legajoService.obtenerLegajoPropio(), {
    initialValue: [],
  });

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
   * % del legajo aprobado.
   *
   * ⚠️ Simplificado: la fórmula real es `aprobados / documentos OBLIGATORIOS
   * del rol`, usando la tabla `roles_tipos_documentos`. Acá el denominador es
   * lo CARGADO, así que da un número optimista: no cuenta lo que todavía ni
   * se subió. Ya existe `LegajoService.documentosRequeridos(idRol)` para
   * calcularlo bien; falta que la sesión guarde el id del rol (hoy solo
   * guarda los nombres). Ver docs/alcance-paneles-roles.md.
   */
  protected readonly progreso = computed(() => {
    const { total, aprobados } = this.resumen();
    return total === 0 ? 0 : Math.round((aprobados / total) * 100);
  });

  protected readonly proximosPasos = computed<ProximoPaso[]>(() => {
    const { total, aprobados, pendientes, rechazados } = this.resumen();
    const pasos: ProximoPaso[] = [];

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

    if (total > 0 && aprobados === total) {
      pasos.push({
        tono: 'aprobado',
        titulo: 'Legajo al día',
        detalle: 'Todos los documentos que subiste están aprobados.',
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
