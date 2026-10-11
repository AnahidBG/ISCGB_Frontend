import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { leyendaDelCalendario } from '../../../../../core/examenes/calendario-mes';
import { APARIENCIA_POR_DIA } from '../apariencia-por-dia';

/**
 * Los chips que explican los colores del calendario: "Libre", "1 parcial" (o
 * "Con parciales") y "Completo".
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio. Con un límite de 1 el estado del medio no existe y no se lista.
 */
@Component({
  selector: 'app-leyenda-calendario',
  templateUrl: './leyenda-calendario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class LeyendaCalendario {
  /** Cuántos parciales admite el período. */
  readonly limite = input.required<number>();

  protected readonly apariencia = APARIENCIA_POR_DIA;
  protected readonly items = computed(() => leyendaDelCalendario(this.limite()));
}
