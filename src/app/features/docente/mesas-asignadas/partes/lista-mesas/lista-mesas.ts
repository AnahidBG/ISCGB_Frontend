import { ChangeDetectionStrategy, Component, LOCALE_ID, inject, input, output } from '@angular/core';
import { MesaAsignada } from '../../../../../core/examenes/modelos/mesa-asignada';
import { fechaDeMesa } from '../../../../../core/mesas/textos-mesas';
import { Boton } from '../../../../../shared/ui/boton/boton';

/**
 * Las mesas de examen que el docente tiene por responder, cada una con
 * "Aceptar" y "Rechazar".
 *
 * PRESENTACIONAL: recibe las mesas ya filtradas y ordenadas, y avisa qué se
 * tocó. Responder, confirmar el rechazo y sacar la mesa de la lista es cosa del
 * contenedor (`MesasAsignadas`).
 */
@Component({
  selector: 'app-lista-mesas',
  imports: [Boton],
  templateUrl: './lista-mesas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaMesas {
  private readonly locale = inject(LOCALE_ID);

  readonly mesas = input<readonly MesaAsignada[]>([]);

  /** La mesa que se está respondiendo: sus botones quedan bloqueados. */
  readonly respondiendo = input<number | null>(null);

  readonly aceptar = output<MesaAsignada>();
  readonly rechazar = output<MesaAsignada>();

  protected fecha(mesa: MesaAsignada): string {
    return fechaDeMesa(mesa.fecha, this.locale);
  }
}
