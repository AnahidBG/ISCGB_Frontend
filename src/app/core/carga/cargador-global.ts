import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CargaService } from './carga.service';
import { PantallaCarga } from '../../shared/ui/pantalla-carga/pantalla-carga';

/**
 * El overlay de espera de toda la aplicación.
 *
 * Se monta UNA sola vez, en `app.html`, arriba del `<router-outlet>`. No hace
 * falta ponerlo en ninguna pantalla: cualquier lugar que necesite tapar todo
 * mientras espera solo tiene que llamar a `CargaService.mostrar()`.
 *
 * No dibuja la animación él mismo — reusa `<app-pantalla-carga>`, el mismo
 * componente que usan las esperas locales. El SVG y los keyframes viven en un
 * solo lugar: si el logo cambia, cambia en todos lados de una.
 */
@Component({
  selector: 'app-cargador-global',
  imports: [PantallaCarga],
  templateUrl: './cargador-global.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargadorGlobal {
  /**
   * `visible` y no `activo`: ya viene con la demora de aparición y el mínimo
   * visible aplicados, así que una llamada de 80ms no hace parpadear la
   * pantalla. Ver `carga.service.ts`.
   */
  protected readonly carga = inject(CargaService);
}
