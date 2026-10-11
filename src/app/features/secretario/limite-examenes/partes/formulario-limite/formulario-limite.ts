import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import {
  LIMITE_DIARIO_MAXIMO,
  LIMITE_DIARIO_MINIMO,
  errorDeLimiteDiario,
} from '../../../../../core/examenes/limite-diario';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';

/** La regla vive en `errorDeLimiteDiario`; acá solo se la conecta al formulario. */
const limiteValido: ValidatorFn = (control) =>
  errorDeLimiteDiario(control.value as number | null) === null ? null : { limite: true };

/**
 * El formulario del límite de exámenes por día.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio ni la API. Recibe el límite vigente y cómo mostrarse, y avisa por
 * `guardar` con el número ya validado. Quien guarda es `LimiteExamenes`.
 */
@Component({
  selector: 'app-formulario-limite',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-limite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioLimite {
  private readonly fb = inject(FormBuilder);

  /** El límite vigente, en exámenes por día. */
  readonly limiteActual = input.required<number>();

  /** `true` mientras se está guardando. */
  readonly guardando = input<boolean>(false);

  /** El aviso de que el cambio se guardó. */
  readonly confirmacion = input<string | null>(null);

  /** Por qué falló el guardado, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  /** Se emite con el límite, ya validado. */
  readonly guardar = output<number>();

  protected readonly minimo = LIMITE_DIARIO_MINIMO;
  protected readonly maximo = LIMITE_DIARIO_MAXIMO;

  /** Se pone en `true` al primer intento de guardar, para no retar antes de tiempo. */
  protected readonly seIntentoGuardar = signal(false);

  /** `number | null`: un `<input type="number">` vacío da `null`, no `''`. */
  protected readonly formulario = this.fb.group({
    limite: this.fb.control<number | null>(null, { validators: [limiteValido] }),
  });

  constructor() {
    // El límite vigente llega por `input()` y cambia al guardar: el formulario
    // arranca de ahí cada vez. Es un `effect` porque el formulario reactivo no
    // es un signal y hay que escribirle.
    effect(() => {
      this.formulario.reset({ limite: this.limiteActual() });
      this.seIntentoGuardar.set(false);
    });
  }

  /** Mensaje de error del campo, o `null`. Solo después del primer intento. */
  protected get errorLimite(): string | null {
    return this.seIntentoGuardar()
      ? errorDeLimiteDiario(this.formulario.controls.limite.value)
      : null;
  }

  /** Guardar lo que ya está guardado no hace nada: el botón queda apagado. */
  protected get sinCambios(): boolean {
    return this.formulario.controls.limite.value === this.limiteActual();
  }

  protected alGuardar(): void {
    this.seIntentoGuardar.set(true);

    const limite = this.formulario.controls.limite.value;
    if (this.formulario.invalid || limite === null || this.sinCambios || this.guardando()) {
      return;
    }

    this.guardar.emit(limite);
  }
}
