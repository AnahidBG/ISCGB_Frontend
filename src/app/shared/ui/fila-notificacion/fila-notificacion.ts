import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';

type Tono = NonNullable<NotificacionPanel['tono']>;

/** Color del puntito por tono. Tabla por clave, con `pendiente` como caso por defecto. */
const CLASE_PUNTO_POR_TONO: Record<Tono, string> = {
  rechazado: 'bg-rechazado',
  aprobado: 'bg-aprobado',
  pendiente: 'bg-pendiente',
};

/**
 * Una fila de notificación: puntito de color, título, descripción y, si el
 * aviso trae `url`, es un enlace.
 *
 * Existe para que el desplegable de la campana y el panel lateral dibujen la
 * MISMA fila sin copiar el markup (Composite: se compone, no se duplica). Es
 * presentacional: no navega por su cuenta más allá del `routerLink` y avisa
 * por `seleccionada` para que quien la contiene decida qué cerrar.
 */
@Component({
  selector: 'app-fila-notificacion',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './fila-notificacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaNotificacion {
  readonly notificacion = input.required<NotificacionPanel>();

  /**
   * Rol ARIA del enlace. Dentro de un `role="menu"` los ítems tienen que ser
   * `menuitem`; en una lista común (el panel lateral) no lleva ninguno.
   */
  readonly rolEnlace = input<'menuitem' | null>(null);

  /** Se tocó la fila (solo pasa si es un enlace). */
  readonly seleccionada = output<void>();

  /** Se descartó esta notificación de la vista actual. */
  readonly eliminada = output<NotificacionPanel>();

  protected readonly clasePunto = computed(
    () => CLASE_PUNTO_POR_TONO[this.notificacion().tono ?? 'pendiente'],
  );
}
