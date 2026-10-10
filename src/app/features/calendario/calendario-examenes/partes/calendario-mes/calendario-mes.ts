import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DIAS_DE_LA_SEMANA,
  DiaCalendario,
  leyendaDelCalendario,
  textoDelLimite,
} from '../../../../../core/examenes/calendario-mes';
import { Icono } from '../../../../../shared/ui/icono/icono';
import { APARIENCIA_POR_DIA, CeldaDia } from '../celda-dia/celda-dia';

/**
 * La leyenda, la grilla de un mes y la nota del límite (SCRUM-183).
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): recibe las
 * semanas ya armadas por `semanasDelMes` y no conoce el servicio. La grilla es
 * una tabla real, con sus encabezados de columna, para que un lector de pantalla
 * anuncie el día de la semana de cada celda.
 */
@Component({
  selector: 'app-calendario-mes',
  imports: [CeldaDia, Icono],
  templateUrl: './calendario-mes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioMes {
  /** Las semanas del mes, de lunes a domingo, con sus días de relleno. */
  readonly semanas = input.required<DiaCalendario[][]>();

  /** "Octubre 2026": lo que dice el título de la tabla para quien no la ve. */
  readonly titulo = input.required<string>();

  /** Cuántos exámenes admite un día. */
  readonly limiteDiario = input.required<number>();

  protected readonly diasDeLaSemana = DIAS_DE_LA_SEMANA;
  protected readonly apariencia = APARIENCIA_POR_DIA;

  protected readonly leyenda = computed(() => leyendaDelCalendario(this.limiteDiario()));
  protected readonly textoLimite = computed(() => textoDelLimite(this.limiteDiario()));
}
