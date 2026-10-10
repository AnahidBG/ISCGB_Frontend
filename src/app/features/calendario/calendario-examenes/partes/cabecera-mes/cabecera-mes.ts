import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icono } from '../../../../../shared/ui/icono/icono';

/**
 * El encabezado de la tarjeta del calendario: el mes y cómo moverse entre meses.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no sabe qué mes
 * es el actual ni de dónde salen los datos. Avisa qué botón se tocó.
 */
@Component({
  selector: 'app-cabecera-mes',
  imports: [Icono],
  templateUrl: './cabecera-mes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CabeceraMes {
  /** "Octubre 2026". */
  readonly titulo = input.required<string>();

  readonly anterior = output<void>();
  /** Vuelve al mes en el que estamos. */
  readonly hoy = output<void>();
  readonly siguiente = output<void>();
}
