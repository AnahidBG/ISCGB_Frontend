import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import {
  DIAS_FRECUENCIA_MAXIMO,
  DIAS_FRECUENCIA_MINIMO,
  errorDeFrecuencia,
  textoFrecuencia,
} from '../../../../../core/notificaciones/frecuencia-avisos';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';

/** La regla vive en `errorDeFrecuencia`; acá solo se la conecta al formulario. */
const frecuenciaValida: ValidatorFn = (control) =>
  errorDeFrecuencia(control.value as number | null) === null ? null : { frecuencia: true };

/**
 * El formulario de la frecuencia de los avisos (SCRUM-151).
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio ni la API. Recibe la frecuencia vigente y cómo mostrarse, y avisa
 * por `guardar` con los días ya validados. Quien guarda es `FrecuenciaAvisos`.
 */
@Component({
  selector: 'app-formulario-frecuencia',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-frecuencia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioFrecuencia {
  private readonly fb = inject(FormBuilder);

  /** La frecuencia vigente, en días. */
  readonly diasActuales = input.required<number>();

  /** `true` mientras se está guardando. */
  readonly guardando = input<boolean>(false);

  /** El aviso de que el cambio se guardó. */
  readonly confirmacion = input<string | null>(null);

  /** Por qué falló el guardado, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  /** Se emite con los días, ya validados. */
  readonly guardar = output<number>();

  protected readonly minimo = DIAS_FRECUENCIA_MINIMO;
  protected readonly maximo = DIAS_FRECUENCIA_MAXIMO;

  /** Se pone en `true` al primer intento de guardar, para no retar antes de tiempo. */
  protected readonly seIntentoGuardar = signal(false);

  /** `number | null`: un `<input type="number">` vacío da `null`, no `''`. */
  protected readonly formulario = this.fb.group({
    dias: this.fb.control<number | null>(null, { validators: [frecuenciaValida] }),
  });

  protected readonly textoActual = computed(() => textoFrecuencia(this.diasActuales()));

  constructor() {
    // La frecuencia vigente llega por `input()` y cambia al guardar: el
    // formulario arranca de ahí cada vez. Es un `effect` porque el formulario
    // reactivo no es un signal y hay que escribirle.
    effect(() => {
      this.formulario.reset({ dias: this.diasActuales() });
      this.seIntentoGuardar.set(false);
    });
  }

  /** Mensaje de error del campo, o `null`. Solo después del primer intento. */
  protected get errorDias(): string | null {
    return this.seIntentoGuardar() ? errorDeFrecuencia(this.formulario.controls.dias.value) : null;
  }

  /** Guardar lo que ya está guardado no hace nada: el botón queda apagado. */
  protected get sinCambios(): boolean {
    return this.formulario.controls.dias.value === this.diasActuales();
  }

  protected alGuardar(): void {
    this.seIntentoGuardar.set(true);

    const dias = this.formulario.controls.dias.value;
    if (this.formulario.invalid || dias === null || this.sinCambios || this.guardando()) {
      return;
    }

    this.guardar.emit(dias);
  }
}
