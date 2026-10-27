import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Una opción del filtro: el valor que se filtra y el texto del botón. */
export interface OpcionFiltro<T extends string = string> {
  valor: T;
  etiqueta: string;
}

/**
 * Una fila de botones tipo chips para elegir UNA opción de filtro, como
 * "Todos · Docentes · Alumnos".
 *
 * Nació en Control de Legajos y se extrajo cuando el panel del Director
 * necesitó el mismo filtro por rol: dos features no copian el markup, lo
 * componen desde acá. Es presentacional: no guarda qué está elegido, lo
 * recibe por `valor` y avisa por `elegida` para que el contenedor decida.
 */
@Component({
  selector: 'app-filtro-segmentado',
  templateUrl: './filtro-segmentado.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltroSegmentado<T extends string = string> {
  readonly opciones = input.required<readonly OpcionFiltro<T>[]>();
  readonly valor = input.required<T>();

  /** Nombre accesible del grupo, por ejemplo "Filtrar por rol". */
  readonly etiqueta = input.required<string>();

  /** Se tocó una opción; trae su valor. */
  readonly elegida = output<T>();
}
