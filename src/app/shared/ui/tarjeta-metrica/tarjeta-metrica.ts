import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * El tono de la tarjeta. Los tres últimos son el semáforo del MVP
 * (CLAUDE.md, regla #3); `neutro` es para un total, que no tiene estado.
 */
export type TonoMetrica = 'neutro' | 'aprobado' | 'pendiente' | 'rechazado';

interface AparienciaMetrica {
  icono: NombreIcono;
  /** Clases del círculo de color detrás del ícono. */
  burbuja: string;
  /** Clases del número. */
  numero: string;
}

const APARIENCIA: Record<TonoMetrica, AparienciaMetrica> = {
  neutro: { icono: 'documento', burbuja: 'bg-info/10 text-info', numero: 'text-texto' },
  aprobado: { icono: 'aprobado', burbuja: 'bg-aprobado/10 text-aprobado', numero: 'text-texto' },
  pendiente: { icono: 'pendiente', burbuja: 'bg-pendiente/10 text-pendiente', numero: 'text-texto' },
  rechazado: { icono: 'rechazado', burbuja: 'bg-rechazado/10 text-rechazado', numero: 'text-texto' },
};

/**
 * Una tarjeta de resumen del dashboard: ícono de color, etiqueta y número.
 *
 *   <app-tarjeta-metrica etiqueta="Aprobados" [valor]="8" tono="aprobado" />
 *
 * Existe como componente compartido y no como un `<div>` repetido en cada
 * panel porque los cuatro paneles muestran la misma fila de tarjetas: si el
 * diseño cambia, cambia en un solo lado. Es el mismo criterio que
 * `app-insignia-estado` con el semáforo de estados.
 *
 * El número va en un `<p>` grande y la etiqueta arriba en gris: la jerarquía
 * es la del Figma, donde el dato es lo que se lee primero de lejos.
 */
@Component({
  selector: 'app-tarjeta-metrica',
  imports: [Icono],
  templateUrl: './tarjeta-metrica.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaMetrica {
  readonly etiqueta = input.required<string>();
  readonly valor = input.required<number>();
  readonly tono = input<TonoMetrica>('neutro');

  protected readonly apariencia = computed(() => APARIENCIA[this.tono()]);
}
