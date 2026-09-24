import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Icono } from '../icono/icono';
import { InsigniaEstado } from '../insignia-estado/insignia-estado';

/** Un paso del trámite: un documento y en qué estado está. */
export interface PasoTramite {
  nombre: string;
  estado: string | null;
  /** `true` si todavía no se subió — no tiene estado porque no existe el legajo. */
  faltante: boolean;
}

/**
 * Mapa del trámite: en qué paso está la persona, de un vistazo.
 *
 * Colapsado muestra solo el resumen ("3 de 8 completado" + la barra de
 * progreso) — en un dashboard con varias tarjetas compitiendo por espacio, el
 * detalle documento por documento solo hace falta cuando alguien quiere
 * entender POR QUÉ el número es el que es. Tocarlo despliega esa lista, con
 * el mismo semáforo de 3 colores que usa el resto del sistema
 * (`app-insignia-estado`) — no inventa un estado nuevo, solo una forma nueva
 * de mostrar los que ya existen.
 *
 * No pide nada a la red: recibe el progreso y los pasos ya calculados (ver
 * `calcularProgresoLegajo` en `core/legajos/progreso-legajo.ts`), así que
 * sirve igual con datos reales o con los de prueba.
 */
@Component({
  selector: 'app-progreso-tramite',
  imports: [Icono, InsigniaEstado],
  templateUrl: './progreso-tramite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgresoTramite {
  readonly porcentaje = input.required<number>();
  readonly aprobados = input.required<number>();
  readonly total = input.required<number>();
  readonly estimado = input<boolean>(false);
  readonly pasos = input.required<readonly PasoTramite[]>();

  /** Colapsado por defecto: ver el comentario de la clase. */
  protected readonly desplegado = signal(false);

  protected alternar(): void {
    this.desplegado.update((valor) => !valor);
  }
}
