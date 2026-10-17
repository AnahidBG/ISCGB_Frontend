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
import {
  MateriaDelDocente,
  claveDeMateriaDelDocente,
  etiquetaDeMateriaDelDocente,
} from '../../../../../core/examenes/modelos/materia-del-docente';
import { NuevoExamen } from '../../../../../core/examenes/modelos/nuevo-examen';
import { TipoExamen } from '../../../../../core/examenes/modelos/tipo-examen';
import { errorDeDia, errorDeHorario } from '../../../../../core/examenes/registro-examen';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import {
  clasesDelCampo,
  descripcionDelCampo,
} from '../../../../../shared/ui/campo-formulario/clases-del-campo';

/**
 * El formulario para registrar un parcial: materia con su comisión, tipo de
 * examen, fecha y horario. Los cuatro son obligatorios.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio ni la API. Recibe las opciones y cómo mostrarse, y avisa por `guardar`
 * con el examen ya validado. Quien lo registra es `CalendarioExamenes`.
 *
 * La materia y la comisión se eligen juntas, en un solo desplegable: cada opción
 * es un par. Los errores de cada campo aparecen recién al primer intento de
 * guardar, para no retar antes de tiempo; el del servidor ("el día ya alcanzó el
 * límite") va arriba y deja todo como estaba para elegir otra fecha.
 */
@Component({
  selector: 'app-formulario-parcial',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-parcial.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioParcial {
  private readonly fb = inject(FormBuilder);

  /** El día elegido en el calendario, "2026-10-13": la fecha arranca ahí. */
  readonly dia = input.required<string>();

  /** El día de hoy: la fecha no puede ser anterior. */
  readonly hoy = input<Date>(new Date());

  readonly materias = input.required<readonly MateriaDelDocente[]>();
  readonly tipos = input.required<readonly TipoExamen[]>();

  /** `true` mientras se está guardando. */
  readonly guardando = input<boolean>(false);

  /** Por qué falló el guardado, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  /** Se emite con el examen, ya validado. */
  readonly guardar = output<NuevoExamen>();
  readonly cancelar = output<void>();

  protected readonly claveDe = claveDeMateriaDelDocente;
  protected readonly etiquetaDe = etiquetaDeMateriaDelDocente;

  /** El `min` del campo fecha: no se puede registrar en una fecha pasada. */
  protected readonly fechaMinima = computed(() => aFechaSola(this.hoy()));

  /** Se pone en `true` al primer intento de guardar, para no retar antes de tiempo. */
  protected readonly seIntentoGuardar = signal(false);

  /**
   * Todos son texto, tal como los entregan los controles del navegador: `materia`
   * es la clave del par materia-comisión y `tipo` el id del tipo, ambos vacíos
   * hasta elegir.
   */
  protected readonly formulario = this.fb.nonNullable.group({
    materia: this.fb.nonNullable.control(''),
    tipo: this.fb.nonNullable.control(''),
    fecha: this.fb.nonNullable.control(''),
    horario: this.fb.nonNullable.control(''),
  });

  private readonly campoMateria = viewChild.required<ElementRef<HTMLSelectElement>>('campoMateria');

  constructor() {
    // La fecha arranca en el día elegido. Es un `effect` porque el formulario
    // reactivo no es un signal y hay que escribirle.
    effect(() => this.formulario.controls.fecha.setValue(this.dia()));

    // El foco pasa al primer campo apenas se dibuja el formulario.
    afterNextRender(() => this.campoMateria().nativeElement.focus());
  }

  protected get errorMateria(): string | null {
    return this.seIntentoGuardar() && this.formulario.controls.materia.value === ''
      ? 'Elegí la materia y la comisión.'
      : null;
  }

  protected get errorTipo(): string | null {
    return this.seIntentoGuardar() && this.formulario.controls.tipo.value === ''
      ? 'Elegí el tipo de examen.'
      : null;
  }

  protected get errorFecha(): string | null {
    return this.seIntentoGuardar()
      ? errorDeDia(this.formulario.controls.fecha.value, this.hoy())
      : null;
  }

  protected get errorHorario(): string | null {
    return this.seIntentoGuardar() ? errorDeHorario(this.formulario.controls.horario.value) : null;
  }

  protected readonly clasesDe = clasesDelCampo;
  protected readonly descripcionDe = descripcionDelCampo;

  protected alGuardar(): void {
    this.seIntentoGuardar.set(true);

    const {
      materia: claveElegida,
      tipo: tipoElegido,
      fecha,
      horario,
    } = this.formulario.getRawValue();
    const materia = this.materias().find((m) => claveDeMateriaDelDocente(m) === claveElegida);
    const tipo = this.tipos().find((t) => String(t.idTipoExamen) === tipoElegido);

    if (
      materia === undefined ||
      tipo === undefined ||
      errorDeDia(fecha, this.hoy()) !== null ||
      errorDeHorario(horario) !== null ||
      this.guardando()
    ) {
      return;
    }

    this.guardar.emit({
      dia: fecha,
      horario,
      idMateria: materia.idMateria,
      idComision: materia.idComision,
      idTipoExamen: tipo.idTipoExamen,
    });
  }
}
