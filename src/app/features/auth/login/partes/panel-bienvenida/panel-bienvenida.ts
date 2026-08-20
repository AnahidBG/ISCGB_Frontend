import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * La mitad verde del login: logo, título institucional y las dos etiquetas
 * de abajo.
 *
 * Es puramente visual. No recibe datos ni avisa nada hacia afuera; por eso
 * no tiene ni `input()` ni `output()`. Un componente así se lee de arriba a
 * abajo sin sorpresas, y se puede mover de lugar sin romper nada.
 */
@Component({
  selector: 'app-panel-bienvenida',
  templateUrl: './panel-bienvenida.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelBienvenida {
  /** Las áreas del sistema que se muestran como etiquetas al pie. */
  protected readonly areas = ['Gestión de Legajos', 'Revisión Administrativa'];
}
