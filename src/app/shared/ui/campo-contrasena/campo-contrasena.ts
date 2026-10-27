import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icono } from '../icono/icono';

/**
 * Dos formas del campo, porque las pantallas de contraseña vienen de dos
 * diseños distintos:
 *   · `estandar`: bordes redondeados y alto cómodo (login, crear contraseña).
 *   · `compacto`: en pastilla y más bajo (nueva contraseña del recupero).
 *
 * Es una tabla por clave, no un `if`: agregar una forma nueva es una línea.
 */
export type VarianteCampoContrasena = 'estandar' | 'compacto';

const CLASES_BASE =
  'w-full border bg-superficie text-texto outline-none transition-colors placeholder:text-texto-suave';

const CLASES_POR_VARIANTE: Record<VarianteCampoContrasena, string> = {
  estandar:
    'rounded-lg py-3.5 hover:border-acento-verde focus:border-principal focus:ring-2 focus:ring-principal/20',
  compacto:
    'rounded-control py-2.5 text-sm focus:border-principal focus:ring-1 focus:ring-principal',
};

/**
 * El campo de contraseña con el ojito para verla u ocultarla.
 *
 * Existe porque equivocarse al tipear una contraseña "a ciegas" es lo que más
 * frustra de cualquier formulario: con el ojito la persona comprueba lo que
 * escribió antes de enviar. Antes el ojito estaba dibujado a mano solo en el
 * login; ahora lo tienen todas las pantallas con contraseña.
 *
 * Es un componente PRESENTACIONAL: no conoce servicios. Se usa de dos maneras:
 *
 *   · Con formularios reactivos, como cualquier campo (implementa
 *     `ControlValueAccessor`):
 *       <app-campo-contrasena idCampo="password" formControlName="password" />
 *
 *   · Con signals, con `valor` como `model()`:
 *       <app-campo-contrasena idCampo="password" [valor]="password()"
 *         (valorChange)="actualizarPassword($event)" />
 *
 * La etiqueta y el mensaje de error NO van acá: los pone `app-campo-formulario`
 * (o la pantalla). `idCampo` tiene que ser el `for` de esa etiqueta. Cuando
 * `invalido` es `true`, el campo se apunta a `<idCampo>-error` con
 * `aria-describedby`: es el `id` que usa `app-campo-formulario` para su error.
 *
 * Detalles que importan:
 *   · El botón es `type="button"`: no envía el formulario.
 *   · El `mousedown` no le saca el foco al campo, así que se puede espiar la
 *     contraseña sin perder el cursor.
 *   · Se apagan la corrección y el spellcheck: con la contraseña a la vista,
 *     el navegador no tiene por qué subrayarla ni mandarla a revisar.
 *   · Edge dibuja su propio ojito en los campos de contraseña; se oculta para
 *     que no aparezcan dos.
 */
@Component({
  selector: 'app-campo-contrasena',
  imports: [Icono],
  templateUrl: './campo-contrasena.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampoContrasena),
      multi: true,
    },
  ],
  styles: `
    input::-ms-reveal,
    input::-ms-clear {
      display: none;
    }
  `,
})
export class CampoContrasena implements ControlValueAccessor {
  /** `id` del `<input>`: el mismo que lleva el `for` de la etiqueta. */
  readonly idCampo = input.required<string>();

  /** `new-password` para elegir una contraseña, `current-password` para ingresar con la que ya se tiene. */
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');

  readonly placeholder = input<string>('');

  /** `true` marca el borde en rojo y conecta el campo con su mensaje de error. */
  readonly invalido = input<boolean>(false);

  /** Dibuja el candado a la izquierda, como en el login. */
  readonly conCandado = input<boolean>(false);

  readonly variante = input<VarianteCampoContrasena>('estandar');

  /** El texto del campo. Con formularios reactivos lo maneja el `FormControl`. */
  readonly valor = model<string>('');

  protected readonly visible = signal(false);
  protected readonly deshabilitado = signal(false);

  protected readonly clasesDelInput = computed(() => {
    const izquierda = this.conCandado() ? 'pl-11' : 'pl-4';
    const borde = this.invalido() ? 'border-rechazado' : 'border-borde';
    return `${CLASES_BASE} ${CLASES_POR_VARIANTE[this.variante()]} ${izquierda} pr-12 ${borde}`;
  });

  protected readonly idDelError = computed(() => `${this.idCampo()}-error`);

  private avisarCambio: (valor: string) => void = () => undefined;
  private avisarToque: () => void = () => undefined;

  // --- ControlValueAccessor -------------------------------------------------

  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
  }

  registerOnChange(funcion: (valor: string) => void): void {
    this.avisarCambio = funcion;
  }

  registerOnTouched(funcion: () => void): void {
    this.avisarToque = funcion;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  // --- Eventos del template ---------------------------------------------------

  protected alEscribir(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.valor.set(texto);
    this.avisarCambio(texto);
  }

  protected alSalir(): void {
    this.avisarToque();
  }

  protected alternar(): void {
    this.visible.update((visible) => !visible);
  }
}
