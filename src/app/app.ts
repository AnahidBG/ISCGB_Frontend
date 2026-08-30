import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CargaService } from './core/carga/carga.service';
import { CargadorGlobal } from './core/carga/cargador-global';

/**
 * Cuánto se reserva el loader global apenas arranca la app.
 *
 * Sin esto, `CargaService` solo se enciende con llamadas HTTP (vía
 * `cargaInterceptor`): una pantalla que no pide nada al servidor apenas
 * carga —el login, por ejemplo— nunca llegaría a mostrar el logo
 * dibujándose. Milena pidió que la animación tenga presencia "al
 * principio", no solo durante las esperas de red.
 */
const DURACION_SPLASH_ARRANQUE_MS = 1100;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CargadorGlobal],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('iscgb-frontend');

  constructor() {
    // Mismo mecanismo que usa `cargaInterceptor`: sumar una espera y
    // restarla. `CargaService` ya se encarga de la demora de aparición y del
    // mínimo visible (ver carga.service.ts), así que acá alcanza con marcar
    // el inicio y el fin — no hay que manejar ningún parpadeo a mano.
    const carga = inject(CargaService);
    carga.mostrar();
    setTimeout(() => carga.ocultar(), DURACION_SPLASH_ARRANQUE_MS);
  }
}
