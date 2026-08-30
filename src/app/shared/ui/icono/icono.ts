import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Los íconos que el sistema sabe dibujar.
 *
 * El Design System todavía no define un set de íconos para el menú lateral
 * (ver docs/design-system.md #4, comentario en `EstructuraPanel`). Mientras
 * tanto, este es un set mínimo y prestado del estilo "stroke" que ya usaba
 * el ícono de hamburguesa de `EstructuraPanel` y el chevron de `Boton`
 * (`stroke="currentColor"`, trazo 1.75-1.8, esquinas redondeadas) — para que
 * no desentonen el día que se reemplacen por los oficiales.
 *
 * Agregar uno nuevo: sumar el nombre acá y el `@case` correspondiente en
 * `icono.html`. Nada más se toca.
 *
 * `colapsar` se agregó el 27/08/2026 junto con el menú lateral desplegable
 * de `EstructuraPanel` — es el único de este set que no sale de ningún
 * dato ni estado del sistema, es puramente de navegación (el chevron del
 * botón que colapsa/expande la barra).
 */
export type NombreIcono =
  | 'panel'
  | 'usuarios'
  | 'documento'
  | 'legajo'
  | 'subir'
  | 'salir'
  | 'menu'
  | 'buscar'
  | 'campana'
  | 'revision'
  | 'aprobado'
  | 'pendiente'
  | 'rechazado'
  | 'reloj'
  | 'colapsar'
  | 'volver'
  | 'calendario'
  | 'configuracion';

/**
 * Un ícono del sistema, dibujado en SVG inline.
 *
 * Por qué SVG inline y no una fuente de íconos o una librería (lucide,
 * heroicons...): el proyecto no tiene ninguna instalada todavía, y sumar una
 * dependencia nueva solo para un puñado de íconos del menú es más costo que
 * beneficio en esta etapa. Si el equipo adopta una librería de íconos más
 * adelante, este componente es el único lugar que hay que tocar — nadie más
 * dibuja SVGs de íconos a mano.
 */
@Component({
  selector: 'app-icono',
  templateUrl: './icono.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
}
