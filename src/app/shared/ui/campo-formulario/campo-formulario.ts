import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * La etiqueta, el mensaje de error y el espacio donde va un campo.
 *
 * NO incluye el `<input>`: eso se le pasa adentro, con `<ng-content>`.
 * Así este componente sirve para un texto, una contraseña, un desplegable
 * o lo que venga, sin saber nada de formularios.
 *
 *   <app-campo-formulario etiqueta="DNI" idCampo="dni" [error]="errorDni()">
 *     <input id="dni" ... />
 *   </app-campo-formulario>
 *
 * `idCampo` tiene que ser el mismo `id` del control que va adentro: es lo que
 * conecta la etiqueta con el campo para los lectores de pantalla, y lo que
 * hace que al tocar el texto "DNI" el cursor salte al recuadro.
 */
@Component({
  selector: 'app-campo-formulario',
  templateUrl: './campo-formulario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampoFormulario {
  /** Texto de la etiqueta. Ej: "DNI". */
  readonly etiqueta = input.required<string>();

  /** `id` del control que se proyecta adentro. */
  readonly idCampo = input.required<string>();

  /** Mensaje de error a mostrar. Vacío o `null` = sin error. */
  readonly error = input<string | null>(null);

  /**
   * Marca el campo como obligatorio con un asterisco rojo, como define el
   * sistema de diseño.
   *
   * El asterisco lleva `aria-hidden` y la palabra "obligatorio" va en un
   * texto solo para lectores de pantalla: un símbolo rojo no se escucha.
   */
  readonly requerido = input<boolean>(false);
}
