import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { PreferenciaTema } from '../../../core/tema/tema';
import { TemaService } from '../../../core/tema/tema.service';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * Cómo se dibuja el selector.
 *
 *   · `segmentos` — las tres opciones juntas (Claro, Oscuro, Automático). Para
 *     donde hay lugar y conviene ver qué está elegido: el menú de la persona,
 *     el cajón del celular y Configuración.
 *   · `boton` — un botón redondo de un solo toque que pasa de un tema al
 *     otro. Para donde hay poco lugar y no hay menú: el login.
 */
export type VarianteSelectorTema = 'segmentos' | 'boton';

interface OpcionTema {
  valor: PreferenciaTema;
  etiqueta: string;
  icono: NombreIcono;
  /** Se muestra al pasar el mouse. Es donde se explica qué hace "Automático". */
  ayuda: string;
}

const OPCIONES: readonly OpcionTema[] = [
  { valor: 'claro', etiqueta: 'Claro', icono: 'sol', ayuda: 'Siempre claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: 'luna', ayuda: 'Siempre oscuro' },
  {
    valor: 'sistema',
    etiqueta: 'Automático',
    icono: 'pantalla',
    ayuda: 'Sigue la configuración de tu dispositivo',
  },
];

/**
 * La opción elegida se distingue por más que el color: va con relieve (fondo
 * de tarjeta y sombra), en negrita, y además lo dice `aria-checked`.
 */
const CLASES_ELEGIDA = 'bg-superficie font-semibold text-principal shadow-marca-sm';
const CLASES_LIBRE = 'font-medium text-texto-suave hover:text-texto';

/**
 * Elegir cómo se ve el sistema: claro, oscuro o el del dispositivo.
 *
 *   <app-selector-tema />                       // las tres opciones
 *   <app-selector-tema variante="boton" />      // un solo toque
 *   <app-selector-tema [enMenu]="true" />       // dentro de un role="menu"
 *
 * Es el ÚNICO lugar donde la persona decide el tema; el resto de la
 * aplicación lo recibe pintado, sin enterarse. La elección se guarda en
 * `TemaService` y se recuerda entre visitas.
 *
 * `enMenu` cambia solo los roles de accesibilidad: dentro de un `role="menu"`
 * las opciones tienen que ser `menuitemradio`, no `radio`, o un lector de
 * pantalla las trata como algo fuera de lugar.
 */
@Component({
  selector: 'app-selector-tema',
  imports: [Icono],
  templateUrl: './selector-tema.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorTema {
  private readonly tema = inject(TemaService);

  readonly variante = input<VarianteSelectorTema>('segmentos');

  /** `true` cuando el selector está dentro de un menú desplegable (`role="menu"`). */
  readonly enMenu = input<boolean>(false);

  protected readonly esOscuro = this.tema.esOscuro;

  /** Las tres opciones, cada una con las clases que le tocan según esté elegida o no. */
  protected readonly opciones = computed(() =>
    OPCIONES.map((opcion) => {
      const elegida = this.tema.preferencia() === opcion.valor;
      return { ...opcion, elegida, clases: elegida ? CLASES_ELEGIDA : CLASES_LIBRE };
    }),
  );

  protected readonly rolGrupo = computed(() => (this.enMenu() ? 'group' : 'radiogroup'));
  protected readonly rolOpcion = computed(() => (this.enMenu() ? 'menuitemradio' : 'radio'));

  /** Dice a dónde lleva el botón de un toque, no dónde está: "Activar modo oscuro". */
  protected readonly etiquetaBoton = computed(() =>
    this.esOscuro() ? 'Activar modo claro' : 'Activar modo oscuro',
  );

  protected elegir(preferencia: PreferenciaTema): void {
    this.tema.establecer(preferencia);
  }

  protected alternar(): void {
    this.tema.alternar();
  }
}
