import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icono } from '../icono/icono';

/**
 * El cartel "¡Tu legajo está completo!" de los paneles (SCRUM-153).
 *
 * Presentacional y sin entradas: decidir CUÁNDO va es del contenedor, con
 * `legajoEstaCompleto`. Está en `shared/ui/` porque lo usan los paneles de
 * Docente y de Alumno, que antes tenían el mismo HTML copiado.
 *
 * Usa el estilo de aprobado del sistema en el borde, el fondo y el ícono. El
 * texto va en `text-texto`: el verde de estado sobre su propio fondo no llega
 * a contraste AA (3,59:1 contra el 4,5:1 que pide WCAG).
 */
@Component({
  selector: 'app-aviso-legajo-completo',
  imports: [Icono],
  templateUrl: './aviso-legajo-completo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoLegajoCompleto {}
