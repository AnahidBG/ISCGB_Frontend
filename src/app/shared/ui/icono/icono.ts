import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Los íconos que usa el sistema. Agregar uno acá es agregar un `@case` en el
 * template — no hay más lugares que tocar.
 */
export type NombreIcono =
  | 'panel'
  | 'legajo'
  | 'subir'
  | 'revision'
  | 'salir'
  | 'buscar'
  | 'campana'
  | 'menu'
  | 'reloj'
  | 'aprobado'
  | 'pendiente'
  | 'rechazado'
  | 'documento'
  | 'flecha';

/**
 * Ícono del sistema, dibujado como SVG en línea.
 *
 *   <app-icono nombre="campana" class="h-5 w-5" />
 *
 * Cierra el pendiente #4 de docs/design-system.md ("el Design System define
 * íconos, todavía no están en código").
 *
 * Son SVG en línea y no una fuente de íconos ni imágenes por dos motivos que
 * importan acá: heredan el color con `currentColor` (así el mismo ícono sirve
 * en el menú gris y en la tarjeta verde sin duplicarlo), y no agregan una
 * descarga más ni una dependencia externa.
 *
 * Todos comparten la misma geometría: grilla de 24, trazo de 1.8, puntas y
 * uniones redondeadas, sin relleno. Esa constancia es lo que hace que un
 * conjunto de íconos se vea como un conjunto y no como una bolsa de dibujos
 * juntados de distintos lados.
 *
 * El tamaño NO viene de acá: se pasa por clase (`h-5 w-5`), como cualquier
 * otro elemento. Es `aria-hidden` siempre — un ícono decorativo al lado de
 * su texto no debe leerse dos veces. Si alguna vez hace falta uno que sea la
 * ÚNICA información de un control, ese control necesita su propio
 * `aria-label`.
 */
@Component({
  selector: 'app-icono',
  templateUrl: './icono.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
}
