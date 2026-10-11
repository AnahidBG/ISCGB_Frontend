import { DiaCalendario } from './dia-calendario';

/** Cómo está un mes del calendario de parciales. */
export interface CalendarioDelMes {
  /** Cuántos parciales admite el período. Es uno solo, para todo el instituto. */
  limite: number;
  /** TODOS los días del mes, en orden, también los que no tienen parciales. */
  dias: DiaCalendario[];
}
