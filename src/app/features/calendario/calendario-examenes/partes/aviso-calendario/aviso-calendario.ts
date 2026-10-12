import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvisoDelCalendario } from '../../../../../core/examenes/modelos/aviso-calendario';

/**
 * La franja roja suave de arriba de la grilla, con el borde izquierdo rojo: un
 * título ("18 de octubre · Fecha bloqueada") y debajo el motivo.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no decide cuándo
 * aparece ni cuándo se va, solo dibuja el aviso que recibe. Es un `role="alert"`:
 * al aparecer, un lector de pantalla lo anuncia. El color va en el borde y el
 * fondo; el texto, en `text-texto`, porque `rechazado` como texto no llega a
 * contraste AA.
 */
@Component({
  selector: 'app-aviso-calendario',
  templateUrl: './aviso-calendario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AvisoCalendario {
  readonly aviso = input.required<AvisoDelCalendario>();
}
