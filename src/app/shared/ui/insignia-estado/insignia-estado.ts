import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Los tres estados válidos de un documento/legajo — el semáforo del MVP.
 *
 * Ver CLAUDE.md, regla de negocio #3: Verde = Aprobado, Amarillo = Pendiente,
 * Rojo = Rechazado. Sin estados intermedios.
 */
export type EstadoDocumento = 'Aprobado' | 'Pendiente' | 'Rechazado';

interface AparienciaEstado {
  etiqueta: string;
  clases: string;
}

const APARIENCIA_POR_ESTADO: Record<EstadoDocumento, AparienciaEstado> = {
  Aprobado: { etiqueta: 'Aprobado', clases: 'bg-aprobado/10 text-aprobado' },
  Pendiente: { etiqueta: 'Pendiente', clases: 'bg-pendiente/10 text-pendiente' },
  Rechazado: { etiqueta: 'Rechazado', clases: 'bg-rechazado/10 text-rechazado' },
};

/** Lo que se dibuja cuando `estado` es `null` o no es ninguno de los tres válidos. */
const APARIENCIA_DESCONOCIDA: AparienciaEstado = {
  etiqueta: 'Sin estado',
  clases: 'bg-humo text-texto-suave',
};

function esEstadoValido(valor: string | null): valor is EstadoDocumento {
  return valor === 'Aprobado' || valor === 'Pendiente' || valor === 'Rechazado';
}

/**
 * Badge de estado documental — el semáforo de 3 colores del sistema.
 *
 * Es el ÚNICO lugar del frontend que dibuja un badge de estado: ninguna
 * pantalla lo reimplementa (CLAUDE.md, regla de negocio #3).
 *
 *   <app-insignia-estado estado="Aprobado" />
 *   <app-insignia-estado [estado]="documento.estado" />
 *
 * `estado` acepta `string | null` a propósito, no `EstadoDocumento | null`:
 * en la base es `varchar(50) NULL` (ver docs/contrato-api.md), texto libre y
 * anulable. El componente no confía en el tipo que declara quien lo usa,
 * valida el VALOR en tiempo de ejecución y cae en "Sin estado" ante
 * cualquier cosa inesperada — null, vacío, o un texto que no es ninguno de
 * los tres — en vez de romper la pantalla o mostrar un color que no
 * corresponde.
 */
@Component({
  selector: 'app-insignia-estado',
  templateUrl: './insignia-estado.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsigniaEstado {
  readonly estado = input<string | null>(null);

  protected readonly apariencia = computed<AparienciaEstado>(() => {
    const valor = this.estado();
    return esEstadoValido(valor) ? APARIENCIA_POR_ESTADO[valor] : APARIENCIA_DESCONOCIDA;
  });
}
