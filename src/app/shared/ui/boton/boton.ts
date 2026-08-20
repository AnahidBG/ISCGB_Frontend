import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Los tres niveles del sistema de diseño. */
export type NivelBoton = 'primario' | 'secundario' | 'terciario';

/**
 * Botón institucional.
 *
 * Los tres niveles salen del Design System del ICGB:
 *
 *   · primario   — verde claro con texto oscuro. La acción principal.
 *   · secundario — verde institucional con texto blanco. Acción de apoyo.
 *   · terciario  — solo texto. Acciones menores, navegación.
 *
 * Si recibe `href` se dibuja como enlace `<a>`; si no, como `<button>`.
 * Esa distinción no es cosmética: un enlace lleva a otro lado y se puede
 * abrir en pestaña nueva, un botón ejecuta una acción en esta página.
 * Usar uno por otro rompe la navegación por teclado y confunde a los
 * lectores de pantalla.
 */
@Component({
  selector: 'app-boton',
  imports: [NgTemplateOutlet],
  templateUrl: './boton.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Boton {
  readonly nivel = input<NivelBoton>('primario');
  readonly deshabilitado = input<boolean>(false);
  readonly anchoCompleto = input<boolean>(false);

  /**
   * `true` mientras la acción está en curso.
   *
   * Muestra un anillo girando y bloquea el botón, para que nadie mande el
   * formulario dos veces por creer que no pasó nada.
   */
  readonly cargando = input<boolean>(false);

  /** Texto durante la carga. Si no se pasa, se mantiene el original. */
  readonly textoCargando = input<string | null>(null);

  /** Si viene, el botón se dibuja como enlace. */
  readonly href = input<string | null>(null);

  /** `_blank` abre en pestaña nueva (para sitios externos). */
  readonly destino = input<'_self' | '_blank'>('_self');

  /** Muestra el chevron doble a la derecha, como en el sistema de diseño. */
  readonly conFlecha = input<boolean>(true);

  readonly tipo = input<'button' | 'submit'>('button');

  /**
   * Clases del nivel elegido.
   *
   * Los estados se resuelven con las variantes de Tailwind (`hover:`,
   * `active:`, `focus-visible:`, `disabled:`) en vez de con JavaScript.
   * El navegador ya sabe cuándo el mouse está encima o cuándo el botón está
   * apretado: no hace falta que se lo contemos nosotros.
   *
   * `focus-visible` en lugar de `focus`: el anillo aparece cuando se navega
   * con teclado, pero no molesta al hacer clic con el mouse.
   */
  /** Un botón cargando también está bloqueado. */
  protected readonly bloqueado = computed(() => this.deshabilitado() || this.cargando());

  protected readonly clases = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 font-medium transition-colors ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
      'disabled:pointer-events-none';

    const ancho = this.anchoCompleto() ? 'w-full' : '';

    const porNivel: Record<NivelBoton, string> = {
      primario:
        'rounded-full bg-acento-verde-claro px-6 py-3 text-sm text-texto ' +
        'hover:bg-acento-verde active:bg-acento-verde-press ' +
        'focus-visible:ring-acento-verde-press ' +
        'disabled:bg-acento-verde-claro/35 disabled:text-texto-suave ' +
        'sm:px-8 sm:py-3.5 sm:text-base',
      secundario:
        'rounded-full bg-principal px-6 py-3 text-sm text-white ' +
        'hover:bg-principal-oscuro active:bg-principal-oscuro ' +
        'focus-visible:ring-principal ' +
        'disabled:bg-gris-marca disabled:text-white/70 ' +
        'sm:px-8 sm:py-3.5 sm:text-base',
      terciario:
        'rounded-md px-1 py-1 text-sm text-texto-suave ' +
        'hover:font-semibold hover:text-texto ' +
        'focus-visible:text-texto focus-visible:underline focus-visible:ring-principal ' +
        'disabled:text-texto-suave/45',
    };

    return `${base} ${porNivel[this.nivel()]} ${ancho}`.trim();
  });
}
