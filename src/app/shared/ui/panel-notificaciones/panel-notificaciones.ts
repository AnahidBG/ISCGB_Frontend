import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  input,
  output,
  viewChild,
  ElementRef,
} from '@angular/core';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { FilaNotificacion } from '../fila-notificacion/fila-notificacion';
import { Icono } from '../icono/icono';

/**
 * Panel lateral con TODAS las notificaciones: se desliza desde la derecha por
 * encima de la pantalla actual, sin navegar a otra ruta.
 *
 * Es presentacional (Mediator): recibe la lista por `input()` y avisa por
 * `cerrar`. Quien decide cuándo está abierto, y a dónde vuelve el foco al
 * cerrarse, es `EstructuraPanel`, que lo compone adentro (Composite).
 *
 * ── Cierre ────────────────────────────────────────────────────────────────
 * Con la X, con Escape (lo escucha `EstructuraPanel`, igual que el cajón de
 * celular) o tocando un aviso que navega. Un clic en el fondo oscurecido NO
 * lo cierra: es el mismo criterio que la usuaria eligió para el desplegable
 * de la campana (se lee de a poco y un toque de más lo hacía desaparecer).
 *
 * ── Accesibilidad ─────────────────────────────────────────────────────────
 * `role="dialog"` + `aria-modal="true"`, con nombre por `aria-labelledby`.
 * Al abrirse, el foco pasa a la X. NO hay trampa de foco: Tab puede salir
 * del panel hacia la página de atrás (no hay Angular CDK; ver el informe).
 */
@Component({
  selector: 'app-panel-notificaciones',
  imports: [FilaNotificacion, Icono],
  templateUrl: './panel-notificaciones.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    @keyframes entrar-desde-la-derecha {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    .panel-deslizante {
      animation: entrar-desde-la-derecha 200ms ease-out;
    }

    /* Quien pide menos movimiento ve el panel aparecer sin deslizarse. */
    @media (prefers-reduced-motion: reduce) {
      .panel-deslizante {
        animation: none;
      }
    }
  `,
})
export class PanelNotificaciones {
  /** La lista COMPLETA, sin tope. */
  readonly notificaciones = input.required<NotificacionPanel[]>();

  /** El número del encabezado (el mismo de la insignia de la campana). */
  readonly cantidad = input<number>(0);

  readonly cerrar = output<void>();
  readonly eliminada = output<NotificacionPanel>();
  readonly marcarLeidas = output<void>();

  private readonly botonCerrar = viewChild.required<ElementRef<HTMLButtonElement>>('botonCerrar');

  constructor() {
    // El foco entra al panel apenas se dibuja, para que quien navega con
    // teclado o lector de pantalla no se quede en la página de atrás.
    afterNextRender(() => this.botonCerrar().nativeElement.focus());
  }
}
