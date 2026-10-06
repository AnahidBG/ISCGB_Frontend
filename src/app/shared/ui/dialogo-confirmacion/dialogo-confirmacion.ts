import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Boton } from '../boton/boton';

/**
 * Diálogo modal para confirmar una acción que no tiene vuelta atrás.
 *
 * Presentacional: no decide nada, solo muestra la pregunta y avisa qué
 * eligió la persona. Quien lo usa lo dibuja dentro de un `@if` y lo saca al
 * recibir cualquiera de las dos respuestas.
 *
 * El mensaje va proyectado con `<ng-content>`. El foco arranca en "cancelar"
 * a propósito: si alguien aprieta Enter sin leer, no pierde nada. Escape
 * también cancela.
 */
@Component({
  selector: 'app-dialogo-confirmacion',
  imports: [Boton],
  templateUrl: './dialogo-confirmacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'cancelar.emit()',
  },
})
export class DialogoConfirmacion {
  readonly titulo = input.required<string>();
  readonly textoConfirmar = input.required<string>();
  readonly textoCancelar = input.required<string>();

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();

  private readonly botonCancelar = viewChild.required('botonCancelar', { read: ElementRef });

  constructor() {
    // Mismo criterio que `PanelNotificaciones`: el foco entra al diálogo
    // apenas se dibuja, para no dejar a quien usa teclado en la página de atrás.
    afterNextRender(() =>
      (this.botonCancelar().nativeElement as HTMLElement).querySelector('button')?.focus(),
    );
  }
}
