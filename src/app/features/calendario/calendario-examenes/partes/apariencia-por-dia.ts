import { EstadoDiaCalendario } from '../../../../core/examenes/modelos/dia-calendario';

/** Cómo se ve un día según su estado. */
export interface AparienciaDia {
  /** El fondo de la celda. */
  fondo: string;
  /** El fondo del chip de la leyenda. */
  chip: string;
  /** El color de la barrita de la celda y del punto del chip. */
  marca: string;
  /** Si lleva el candado: el día ya no admite más parciales. */
  candado: boolean;
  /** Si la cantidad se muestra en número: en pantallas chicas la etiqueta no entra. */
  cantidadEnChico: boolean;
}

/**
 * La apariencia de cada estado (tabla por clave, `docs/patrones-frontend.md`
 * §2.8). El texto va en `text-texto` y el color lo llevan la barrita, el fondo y
 * el candado: `aprobado` y `pendiente` como texto no llegan a contraste AA (ver
 * `styles.scss`).
 *
 * La usan la grilla (el fondo de la celda), el resumen de cada día (la barrita y
 * el candado) y la leyenda (el chip): así un estado tiene el mismo color en los
 * tres lugares.
 */
export const APARIENCIA_POR_DIA: Record<EstadoDiaCalendario, AparienciaDia> = {
  disponible: {
    fondo: 'bg-superficie',
    chip: 'bg-aprobado/10',
    marca: 'bg-aprobado',
    candado: false,
    cantidadEnChico: false,
  },
  ocupado: {
    fondo: 'bg-pendiente/10',
    chip: 'bg-pendiente/10',
    marca: 'bg-pendiente',
    candado: false,
    cantidadEnChico: true,
  },
  completo: {
    fondo: 'bg-rechazado/10',
    chip: 'bg-rechazado/10',
    marca: 'bg-rechazado',
    candado: true,
    cantidadEnChico: false,
  },
};

/** El fondo de un día de relleno, que es de un mes vecino y no tiene estado. */
export const FONDO_FUERA_DEL_MES = 'bg-fondo-panel';
