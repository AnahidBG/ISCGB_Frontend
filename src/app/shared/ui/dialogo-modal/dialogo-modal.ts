import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icono } from '../icono/icono';

/** Lo que se puede enfocar con Tab: el recorrido que la trampa de foco mantiene adentro. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Para que cada diálogo tenga el `id` de su título: dos abiertos a la vez no se pisan. */
let siguienteId = 0;

/**
 * Marca como inertes los elementos que rodean al diálogo, hasta la raíz de la
 * página, y devuelve la función que los libera.
 *
 * `inert` saca al fondo del recorrido con Tab, de los clics y de los lectores de
 * pantalla: es lo que hace que "el fondo no se pueda usar". Solo se tocan los
 * hermanos de cada ancestro, nunca el camino que lleva al diálogo.
 */
function aislarElFondo(anfitrion: HTMLElement): () => void {
  const aislados: Element[] = [];
  let actual: HTMLElement | null = anfitrion;

  while (actual !== null && actual.parentElement !== null && actual !== actual.ownerDocument.body) {
    for (const hermano of Array.from(actual.parentElement.children)) {
      // Lo que ya era inerte lo era antes de abrir el diálogo: se deja como estaba.
      if (hermano !== actual && !hermano.hasAttribute('inert')) {
        hermano.setAttribute('inert', '');
        aislados.push(hermano);
      }
    }
    actual = actual.parentElement;
  }

  return () => aislados.forEach((elemento) => elemento.removeAttribute('inert'));
}

/**
 * Diálogo modal genérico: un marco con título, un botón de cerrar y el contenido
 * proyectado con `<ng-content>`. No decide nada, solo avisa por `cerrar`.
 *
 * Presentacional. Quien lo usa lo dibuja dentro de un `@if` y lo saca al recibir
 * `cerrar`. Para confirmar una acción sin vuelta atrás existe
 * `app-dialogo-confirmacion`; este es para alojar un formulario u otro contenido.
 *
 * Accesibilidad:
 *
 *   · `role="dialog"` y `aria-modal`, con el título como nombre (`aria-labelledby`).
 *   · Al abrirse el foco entra al diálogo, y al cerrarse vuelve a quien lo tenía.
 *   · Escape y el botón de cerrar lo cierran. Un clic en el fondo NO: un toque de
 *     más no tiene que tirar lo que se estaba completando.
 *   · El foco no se escapa: Tab y Shift+Tab giran dentro del diálogo, y el resto
 *     de la página queda inerte (`inert`) mientras está abierto.
 *
 * Con `bloqueado` no se cierra: lo usa quien está guardando algo y no quiere
 * perder la respuesta.
 */
@Component({
  selector: 'app-dialogo-modal',
  imports: [Icono],
  templateUrl: './dialogo-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'pedirCierre()',
  },
})
export class DialogoModal {
  private readonly documento = inject(DOCUMENT);
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly titulo = input.required<string>();

  /** Una línea debajo del título. */
  readonly subtitulo = input<string | null>(null);

  /** Mientras es `true`, ni Escape ni el botón cierran el diálogo. */
  readonly bloqueado = input<boolean>(false);

  readonly cerrar = output<void>();

  protected readonly idTitulo = `dialogo-modal-titulo-${++siguienteId}`;

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    // Quien tenía el foco al abrir (el día del calendario, por ejemplo) es a
    // quien se lo devolvemos al cerrar. Se lee ahora, antes de mover el foco.
    const activoAlAbrir =
      this.documento.activeElement instanceof HTMLElement ? this.documento.activeElement : null;
    let liberarElFondo = () => {};

    afterNextRender(() => {
      liberarElFondo = aislarElFondo(this.anfitrion.nativeElement);
      this.panel().nativeElement.focus();
    });

    inject(DestroyRef).onDestroy(() => {
      liberarElFondo();
      if (activoAlAbrir?.isConnected) {
        activoAlAbrir.focus();
      }
    });
  }

  protected pedirCierre(): void {
    if (!this.bloqueado()) {
      this.cerrar.emit();
    }
  }

  /** La trampa de foco: Tab en el último vuelve al primero, y Shift+Tab en el primero, al último. */
  protected alTeclear(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab') {
      return;
    }

    const panel = this.panel().nativeElement;
    const enfocables = Array.from(panel.querySelectorAll<HTMLElement>(ENFOCABLES));
    if (enfocables.length === 0) {
      evento.preventDefault();
      panel.focus();
      return;
    }

    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = this.documento.activeElement;

    if (evento.shiftKey && (activo === primero || activo === panel)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }
}
