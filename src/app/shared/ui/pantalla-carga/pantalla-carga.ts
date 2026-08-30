import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Tamaños del logo. `completo` es el que usa el overlay de pantalla entera. */
export type TamanoCarga = 'sm' | 'md' | 'lg' | 'completo';

/** Sobre blanco (el habitual) o sobre verde institucional. */
export type TonoCarga = 'claro' | 'verde';

/**
 * El logo del instituto dibujándose. Es la única animación de espera del
 * sistema: nunca un spinner genérico.
 *
 * Este componente es DELIBERADAMENTE tonto: solo dibuja. No sabe si lo está
 * usando el overlay de pantalla completa o una tarjeta chiquita adentro de un
 * panel, y no habla con ningún servicio. Esa ignorancia es la que permite
 * reusarlo en los dos casos sin duplicar el SVG ni la animación:
 *
 *   · Espera global (recarga de página, llamada HTTP) → no lo uses directo:
 *     lo monta `<app-cargador-global>`, que ya vive en `app.html`.
 *     Para mostrarlo alcanza con `CargaService.mostrar()` / `.ocultar()`.
 *
 *   · Espera local (el historial de un panel lateral, una tabla, un modal) →
 *     usalo directo, atado a un signal PROPIO del componente:
 *
 *       @if (cargandoHistorial()) {
 *         <app-pantalla-carga tamano="lg" mensaje="Cargando historial…" />
 *       }
 *
 *     Nunca uses `CargaService` para eso: taparía toda la pantalla por algo
 *     que pasa adentro de una caja. Ver `carga.service.ts`.
 *
 * Para un botón que está trabajando tampoco va esto: `<app-boton [cargando]>`
 * ya tiene su propio spinner chico adentro.
 */
@Component({
  selector: 'app-pantalla-carga',
  templateUrl: './pantalla-carga.html',
  styleUrl: './pantalla-carga.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
  },
})
export class PantallaCarga {
  /** Texto debajo del logo. `null` lo saca (útil en tamaño `sm`). */
  readonly mensaje = input<string | null>('Cargando…');

  readonly tamano = input<TamanoCarga>('md');

  /**
   * `claro` = logo verde sobre fondo claro. `verde` = logo blanco sobre el
   * verde institucional, para pantallas de bienvenida o splash de arranque.
   */
  readonly tono = input<TonoCarga>('claro');

  /**
   * `true` ocupa toda la ventana con `position: fixed`.
   *
   * Ojo: esto es para el overlay global. Un loader LOCAL nunca debería
   * ponerlo en `true` — taparía la pantalla entera por algo que está pasando
   * adentro de un panel. Se queda en `false` y se centra en su contenedor.
   */
  readonly pantallaCompleta = input<boolean>(false);

  protected readonly clases = computed(
    () => `pantalla-carga pantalla-carga--${this.tamano()} pantalla-carga--${this.tono()}`,
  );
}
