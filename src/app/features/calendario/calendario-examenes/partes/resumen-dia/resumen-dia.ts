import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CeldaGrilla, etiquetaDelDia } from '../../../../../core/examenes/calendario-mes';
import { Icono } from '../../../../../shared/ui/icono/icono';
import { APARIENCIA_POR_DIA } from '../apariencia-por-dia';

/**
 * Lo de adentro de una celda del calendario, con el aspecto del Figma: el número
 * del día, la barrita del color del estado y su etiqueta ("Libre", "1 parcial",
 * "Completo"), y el candado en los días completos.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): lo usa la pantalla
 * dentro de la plantilla que le pasa a `app-grilla-calendario`. La celda en sí
 * (el fondo, el foco y los atributos de accesibilidad) la pone la grilla.
 *
 * En pantallas chicas la etiqueta no entra: quedan la barrita, la cantidad en
 * número y el candado, que distinguen los tres estados sin depender solo del
 * color. La etiqueta sigue ahí para los lectores de pantalla.
 */
@Component({
  selector: 'app-resumen-dia',
  imports: [DatePipe, Icono],
  templateUrl: './resumen-dia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sin esto el host es `inline` y sus `div` de adentro rompen el flujo de la celda.
  host: { class: 'block' },
})
export class ResumenDia {
  readonly celda = input.required<CeldaGrilla>();

  protected readonly apariencia = computed(
    () => APARIENCIA_POR_DIA[this.celda().dia?.estado ?? 'disponible'],
  );

  /** "Libre", "1 parcial", "Completo". */
  protected readonly etiqueta = computed(() => {
    const { dia } = this.celda();
    return etiquetaDelDia(dia?.estado ?? 'disponible', dia?.cantidad ?? 0);
  });

  protected readonly claseNumero = computed(() => {
    const { esHoy, delMes } = this.celda();
    if (esHoy) {
      return 'font-bold text-principal';
    }
    return delMes ? 'font-medium text-texto' : 'font-medium text-texto-suave';
  });
}
