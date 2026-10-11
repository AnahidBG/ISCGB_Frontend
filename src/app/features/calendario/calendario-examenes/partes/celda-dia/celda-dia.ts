import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  DiaCalendario,
  EstadoDia,
  etiquetaDelDia,
  nombreDelMes,
} from '../../../../../core/examenes/calendario-mes';
import { Icono } from '../../../../../shared/ui/icono/icono';

/** Cómo se ve un día según su estado. */
export interface AparienciaDia {
  /** El fondo de la celda. */
  fondo: string;
  /** El fondo del chip de la leyenda. */
  chip: string;
  /** El color de la barrita de la celda y del punto del chip. */
  marca: string;
  /** El peso y el color del número del día. */
  numero: string;
  /** Si lleva el candado: el día ya no admite más exámenes. */
  candado: boolean;
  /** Si la cantidad se muestra en número: en pantallas chicas la etiqueta no entra. */
  cantidadEnChico: boolean;
}

/**
 * La apariencia de cada estado. El texto va en `text-texto` y el color lo llevan
 * la barrita, el fondo y el candado: `aprobado` y `pendiente` como texto no
 * llegan a contraste AA (ver `styles.scss`).
 */
export const APARIENCIA_POR_DIA: Record<EstadoDia, AparienciaDia> = {
  Libre: {
    fondo: 'bg-superficie',
    chip: 'bg-aprobado/10',
    marca: 'bg-aprobado',
    numero: 'font-medium text-texto',
    candado: false,
    cantidadEnChico: false,
  },
  ConExamenes: {
    fondo: 'bg-pendiente/10',
    chip: 'bg-pendiente/10',
    marca: 'bg-pendiente',
    numero: 'font-medium text-texto',
    candado: false,
    cantidadEnChico: true,
  },
  Completo: {
    fondo: 'bg-rechazado/10',
    chip: 'bg-rechazado/10',
    marca: 'bg-rechazado',
    numero: 'font-medium text-texto',
    candado: true,
    cantidadEnChico: false,
  },
};

/**
 * Lo que se dibuja cuando el día no tiene estado: los días de relleno, que son
 * de los meses vecinos. Sin barrita ni chip: no hay nada que explicar.
 */
const APARIENCIA_FUERA_DEL_MES: AparienciaDia = {
  fondo: 'bg-fondo-panel',
  chip: '',
  marca: '',
  numero: 'font-medium text-texto-suave',
  candado: false,
  cantidadEnChico: false,
};

/** El número de hoy: un realce sobrio, sin cambiar el fondo ni agregar marcas. */
const NUMERO_DE_HOY = 'font-bold text-principal';

/**
 * Una celda de la grilla del calendario (SCRUM-183).
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): recibe el día ya
 * armado y lo dibuja. No es interactiva: por ahora el calendario solo se consulta.
 *
 * El selector es un atributo sobre `<td>` y no un elemento propio: un elemento
 * desconocido adentro de un `<tr>` rompe la estructura de la tabla y su
 * semántica para los lectores de pantalla.
 */
@Component({
  selector: 'td[app-celda-dia]',
  imports: [Icono],
  templateUrl: './celda-dia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'clases()',
    '[attr.aria-current]': 'dia().esHoy ? "date" : null',
  },
})
export class CeldaDia {
  readonly dia = input.required<DiaCalendario>();

  protected readonly apariencia = computed(() => {
    const estado = this.dia().estado;
    return estado === null ? APARIENCIA_FUERA_DEL_MES : APARIENCIA_POR_DIA[estado];
  });

  // `relative` ancla los textos `sr-only` (son `absolute`) a su celda.
  // `h-14 sm:h-24` es el alto mínimo: en una tabla, `height` en una celda no la achica.
  protected readonly clases = computed(
    () =>
      `relative h-14 overflow-hidden border border-borde p-1 align-top sm:h-24 sm:p-2 ${this.apariencia().fondo}`,
  );

  protected readonly claseNumero = computed(() =>
    this.dia().esHoy ? NUMERO_DE_HOY : this.apariencia().numero,
  );

  /** "Libre", "1 examen", "Completo". Vacío en los días de relleno. */
  protected readonly etiqueta = computed(() => {
    const { estado, cantidad } = this.dia();
    return estado === null ? '' : etiquetaDelDia(estado, cantidad);
  });

  /** El mes de un día de relleno: "Julio". */
  protected readonly mesDeRelleno = computed(() => nombreDelMes(this.dia().fecha.getMonth() + 1));
}
