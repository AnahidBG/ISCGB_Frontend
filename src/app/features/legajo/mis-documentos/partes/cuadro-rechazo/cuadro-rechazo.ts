import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  MOTIVOS_RECHAZO,
  MotivoRechazo,
  comentarioDeRechazo,
} from '../../../../../core/legajos/motivos-rechazo';

/**
 * Cuadro de "Rechazar" un documento del legajo (Secretaría o Dirección
 * revisando el legajo de otra persona).
 *
 * Antes el motivo era un textarea libre. Ahora son casillas con los motivos
 * de la institución (regla #4), se puede marcar más de uno y hace falta al
 * menos uno, más una aclaración opcional para el detalle ("falta la hoja 2").
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no inyecta
 * servicios ni sabe de la API. Solo junta la elección y emite el `comentario`
 * ya armado por `comentarioDeRechazo`. El envío lo hace `MisDocumentos`.
 */
@Component({
  selector: 'app-cuadro-rechazo',
  templateUrl: './cuadro-rechazo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuadroRechazo {
  /**
   * Prefijo de los `id` del cuadro. Hay uno por fila de documento, así que
   * cada casilla y su `<label>` necesitan un id que no choque con otra fila.
   */
  readonly prefijoId = input.required<string>();

  /** El comentario armado: motivos marcados + aclaración. Nunca vacío. */
  readonly confirmar = output<string>();

  readonly cancelar = output<void>();

  protected readonly motivos = MOTIVOS_RECHAZO;

  protected readonly elegidos = signal<ReadonlySet<MotivoRechazo>>(new Set());

  protected readonly aclaracion = signal('');

  /** `true` desde que se intentó confirmar sin ningún motivo marcado. */
  private readonly intentoConfirmar = signal(false);

  /** Se va solo en cuanto se marca un motivo: no hace falta volver a confirmar para limpiarlo. */
  protected readonly error = computed(() =>
    this.intentoConfirmar() && this.elegidos().size === 0
      ? 'Marcá al menos un motivo: es lo que la persona tiene que corregir.'
      : null,
  );

  protected alternar(motivo: MotivoRechazo, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.elegidos.update((actual) => {
      const nuevo = new Set(actual);
      if (marcado) {
        nuevo.add(motivo);
      } else {
        nuevo.delete(motivo);
      }
      return nuevo;
    });
  }

  protected intentarConfirmar(): void {
    const comentario = comentarioDeRechazo([...this.elegidos()], this.aclaracion());
    if (comentario === '') {
      this.intentoConfirmar.set(true);
      return;
    }
    this.confirmar.emit(comentario);
  }
}
