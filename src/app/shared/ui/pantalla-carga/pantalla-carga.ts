import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pantalla de espera con el logo del instituto dibujándose.
 *
 * Se usa mientras se resuelve algo que tarda: cargar una pantalla, esperar
 * una respuesta larga, verificar la sesión al entrar.
 *
 *   <app-pantalla-carga mensaje="Cargando tu legajo…" />
 *
 * Para un botón que está trabajando NO se usa esto: alcanza con el spinner
 * chiquito adentro del botón. Esta pantalla tapa todo, así que se reserva
 * para cuando de verdad no hay nada más que mostrar.
 */
@Component({
  selector: 'app-pantalla-carga',
  templateUrl: './pantalla-carga.html',
  styleUrl: './pantalla-carga.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PantallaCarga {
  /** Texto debajo del logo. */
  readonly mensaje = input<string>('Cargando…');

  /** `true` para ocupar toda la ventana; `false` para quedarse en su caja. */
  readonly pantallaCompleta = input<boolean>(true);
}
