import { CanDeactivateFn } from '@angular/router';

/**
 * Una pantalla que puede tener datos cargados que todavía no se enviaron.
 *
 * La pantalla es la única que sabe si hay algo sin enviar y cómo preguntarlo
 * (su propio diálogo, con su propio texto). El guard solo le cede la decisión.
 */
export interface ConCambiosSinEnviar {
  /**
   * `true` si se puede salir ya. Si hay algo sin enviar, pregunta y resuelve
   * con la respuesta de la persona.
   */
  confirmarSalida(): boolean | Promise<boolean>;
}

/**
 * Frena la navegación DENTRO de la app ("‹ Volver", la barra lateral, cerrar
 * sesión) si la pantalla tiene algo sin enviar.
 *
 * No cubre cerrar la pestaña ni recargar: eso no pasa por el router. Para eso
 * la pantalla escucha `beforeunload`, y ahí el navegador muestra SU diálogo
 * genérico — ningún navegador actual deja poner un texto propio.
 */
export const confirmarSalidaGuard: CanDeactivateFn<ConCambiosSinEnviar> = (pantalla) =>
  pantalla.confirmarSalida();
