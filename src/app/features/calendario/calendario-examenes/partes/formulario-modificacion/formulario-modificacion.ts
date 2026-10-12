import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { aFechaSola } from '../../../../../core/comun/fechas';
import { ExamenCalendario } from '../../../../../core/examenes/modelos/examen-calendario';
import { hayCambiosEnElParcial } from '../../../../../core/examenes/modificacion-examen';
import { errorDeDia, errorDeHorario } from '../../../../../core/examenes/registro-examen';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import { clasesDelCampo, descripcionDelCampo } from '../campo-del-formulario';

/** Lo que se cambia de un parcial: el día ("2026-10-14") y el horario ("09:00"). */
export interface CambioDeParcial {
  dia: string;
  horario: string;
}

/**
 * El formulario para modificar un parcial: fecha y horario, precargados con los
 * del parcial. Es lo único que el backend deja cambiar; la materia, la comisión y
 * el tipo se muestran aparte, de solo lectura.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio. Avisa por `guardar` con el cambio ya validado, por `cancelar` y por
 * `eliminar`, que es solo el pedido: quien confirma la baja es `ModificarParcial`.
 *
 * "Guardar" queda apagado mientras no cambie nada (mismo criterio que "Límite de
 * parciales"). Los errores de cada campo aparecen recién al primer intento de
 * guardar; el del servidor ("el día ya alcanzó el límite") va arriba y deja todo
 * como estaba para elegir otra fecha.
 */
@Component({
  selector: 'app-formulario-modificacion',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-modificacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioModificacion {
  private readonly fb = inject(FormBuilder);

  /** El parcial que se modifica: de él salen la fecha y el horario iniciales. */
  readonly examen = input.required<ExamenCalendario>();

  /** El día de hoy: la fecha no puede ser anterior. */
  readonly hoy = input<Date>(new Date());

  /** `true` mientras se está guardando o eliminando. */
  readonly guardando = input<boolean>(false);

  /** Por qué falló el pedido, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  /** Se emite con el cambio, ya validado. */
  readonly guardar = output<CambioDeParcial>();
  readonly cancelar = output<void>();
  readonly eliminar = output<void>();

  protected readonly clasesDe = clasesDelCampo;
  protected readonly descripcionDe = descripcionDelCampo;

  /** El `min` del campo fecha: no se puede pasar un parcial a una fecha pasada. */
  protected readonly fechaMinima = computed(() => aFechaSola(this.hoy()));

  /** Se pone en `true` al primer intento de guardar, para no retar antes de tiempo. */
  protected readonly seIntentoGuardar = signal(false);

  /** Los dos son texto, tal como los entregan los controles del navegador. */
  protected readonly formulario = this.fb.nonNullable.group({
    fecha: this.fb.nonNullable.control(''),
    horario: this.fb.nonNullable.control(''),
  });

  private readonly campoFecha = viewChild.required<ElementRef<HTMLInputElement>>('campoFecha');

  constructor() {
    // Arranca con la fecha y el horario del parcial. Es un `effect` porque el
    // formulario reactivo no es un signal y hay que escribirle.
    effect(() => {
      const { fecha, horario } = this.examen();
      this.formulario.setValue({ fecha, horario });
    });

    // El foco pasa al primer campo apenas se dibuja el formulario.
    afterNextRender(() => this.campoFecha().nativeElement.focus());
  }

  protected get errorFecha(): string | null {
    return this.seIntentoGuardar()
      ? errorDeDia(this.formulario.controls.fecha.value, this.hoy())
      : null;
  }

  protected get errorHorario(): string | null {
    return this.seIntentoGuardar() ? errorDeHorario(this.formulario.controls.horario.value) : null;
  }

  /** `true` si la fecha y el horario siguen siendo los del parcial: no hay nada que guardar. */
  protected get sinCambios(): boolean {
    const { fecha, horario } = this.formulario.getRawValue();
    return !hayCambiosEnElParcial(this.examen(), fecha, horario);
  }

  protected alGuardar(): void {
    this.seIntentoGuardar.set(true);

    const { fecha, horario } = this.formulario.getRawValue();
    if (
      errorDeDia(fecha, this.hoy()) !== null ||
      errorDeHorario(horario) !== null ||
      this.sinCambios ||
      this.guardando()
    ) {
      return;
    }

    this.guardar.emit({ dia: fecha, horario });
  }
}
