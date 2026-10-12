import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  LOCALE_ID,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ExamenCalendario } from '../../../../../core/examenes/modelos/examen-calendario';
import { preguntaDeEliminarParcial } from '../../../../../core/examenes/modificacion-examen';
import { diaEnPalabras } from '../../../../../core/examenes/registro-examen';
import { DialogoConfirmacion } from '../../../../../shared/ui/dialogo-confirmacion/dialogo-confirmacion';
import { DialogoModal } from '../../../../../shared/ui/dialogo-modal/dialogo-modal';
import {
  CambioDeParcial,
  FormularioModificacion,
} from '../formulario-modificacion/formulario-modificacion';

/**
 * El modal "Modificar parcial": el marco (`app-dialogo-modal`), el día en palabras,
 * un resumen de solo lectura (materia, comisión y tipo: el backend no deja
 * cambiarlos), el formulario de fecha y horario y, si se pide la baja, la
 * confirmación (`app-dialogo-confirmacion`).
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio. Recibe todo por `input()` y avisa por `output()`: `eliminar` sale
 * recién cuando la persona confirmó.
 *
 * Mientras se pregunta si eliminar, el modal de atrás queda inerte y sin cerrarse
 * con Escape (que cancela la pregunta, no todo), y al cancelar el foco vuelve al
 * botón "Eliminar parcial".
 */
@Component({
  selector: 'app-modificar-parcial',
  imports: [DialogoModal, DialogoConfirmacion, FormularioModificacion],
  templateUrl: './modificar-parcial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModificarParcial {
  private readonly locale = inject(LOCALE_ID);
  private readonly documento = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** El parcial que se modifica, tal como estaba en la grilla al tocarlo. */
  readonly examen = input.required<ExamenCalendario>();
  readonly hoy = input<Date>(new Date());

  /** `true` mientras se está guardando o eliminando: el modal no se puede cerrar. */
  readonly guardando = input<boolean>(false);

  /** Por qué falló el pedido, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  readonly guardar = output<CambioDeParcial>();
  /** La persona confirmó que quiere eliminar el parcial. */
  readonly eliminar = output<void>();
  readonly cerrar = output<void>();

  /** `true` mientras se muestra la pregunta "¿Eliminar el parcial…?". */
  protected readonly confirmando = signal(false);

  protected readonly diaEnTexto = computed(() => diaEnPalabras(this.examen().fecha, this.locale));

  protected readonly pregunta = computed(() => {
    const { materia, fecha } = this.examen();
    return preguntaDeEliminarParcial(materia, fecha, this.locale);
  });

  /** Quien tenía el foco al preguntar (el botón "Eliminar parcial"): a él vuelve. */
  private quienPregunto: HTMLElement | null = null;

  protected pedirConfirmacion(): void {
    const activo = this.documento.activeElement;
    this.quienPregunto = activo instanceof HTMLElement ? activo : null;
    this.confirmando.set(true);
  }

  protected cancelarConfirmacion(): void {
    this.confirmando.set(false);
    // El modal de atrás recién deja de ser inerte después de dibujar.
    afterNextRender(() => this.quienPregunto?.focus(), { injector: this.injector });
  }

  protected confirmarEliminacion(): void {
    this.confirmando.set(false);
    this.eliminar.emit();
  }
}
