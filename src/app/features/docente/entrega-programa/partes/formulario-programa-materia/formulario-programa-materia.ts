import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, input } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import { ContenidoUnidad } from '../../../../../core/programas-materia/modelos/contenido-unidad';
import {
  MateriaACargo,
  etiquetaDeMateria,
} from '../../../../../core/programas-materia/modelos/contexto-docente';
import { ProgramaMateria } from '../../../../../core/programas-materia/modelos/programa-materia';

/** Los valores de "Condición" que maneja el instituto. */
const OPCIONES_CONDICION = ['Cuatrimestral', 'Anual'] as const;

/** Los valores de "Formato curricular" que maneja el instituto. */
const OPCIONES_FORMATO_CURRICULAR = [
  'Materia teórica',
  'Materia práctica',
  'Materia teórico-práctica',
] as const;

type GrupoUnidad = FormGroup<{
  tituloUnidad: FormControl<string>;
  contenido: FormControl<string>;
  bibliografiaObligatoria: FormControl<string>;
  bibliografiaComplementaria: FormControl<string>;
}>;

/**
 * Formulario de entrega del programa de materia (Docente).
 *
 * Componente PRESENTACIONAL: solo junta los datos, valida el formato y
 * emite el resultado ya armado como `ProgramaMateria`. No sabe nada de
 * `ProgramasMateriaService` ni de si el envío salió bien o mal — eso lo
 * maneja el contenedor (`entrega-programa.ts`).
 *
 * El número de unidad (`unidad`) no se pide en el formulario: se calcula
 * solo, según el orden en que quedan las filas al enviar. Pedirlo a mano
 * es una fuente de errores (unidades salteadas o repetidas) que no aporta
 * nada — el orden de la lista ya lo dice.
 *
 * ── Los ids salieron del formulario (01/09/2026) ──────────────────────────
 * Antes esta pantalla pedía "ID Docente" e "ID Materia" como dos campos
 * numéricos a mano. Nadie sabe de memoria su id en la tabla `docentes`, y
 * escribir el número equivocado guardaba el programa a nombre de otra
 * persona sin que nada avisara: el backend solo valida que el id EXISTA, no
 * que sea el tuyo.
 *
 * Ahora los dos salen de `GET /api/ProgramasMateria/contexto-docente/{id}`,
 * que los resuelve desde la sesión: el `idDocente` llega ya resuelto por
 * `input` y la materia se elige por nombre de una lista. Ver
 * `ContextoDocente`.
 */
@Component({
  selector: 'app-formulario-programa-materia',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-programa-materia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioProgramaMateria {
  private readonly fb = inject(FormBuilder);

  /** `true` mientras se está enviando el programa al servidor. */
  readonly enviando = input<boolean>(false);

  /** Mensaje de error del último intento de envío, o `null` si no hubo. */
  readonly error = input<string | null>(null);

  /**
   * El docente que firma el programa, ya resuelto desde la sesión por el
   * contenedor. No se pide ni se muestra: la persona no elige quién es.
   */
  readonly idDocente = input.required<number>();

  /** Las materias que puede elegir. El contenedor garantiza que no viene vacía. */
  readonly materias = input.required<MateriaACargo[]>();

  @Output() readonly enviarPrograma = new EventEmitter<ProgramaMateria>();

  protected readonly opcionesCondicion = OPCIONES_CONDICION;
  protected readonly opcionesFormatoCurricular = OPCIONES_FORMATO_CURRICULAR;
  protected readonly etiquetaDeMateria = etiquetaDeMateria;

  protected readonly formulario = this.fb.nonNullable.group({
    // ── Identificación ──────────────────────────────────────────────────
    // `idDocente` ya no está acá: lo pone `enviar()` desde el input. Lo
    // único que se elige es la materia, y por nombre.
    idMateria: [0, [Validators.required, Validators.min(1)]],
    cicloLectivo: [String(new Date().getFullYear()), [Validators.required]],
    condicion: [OPCIONES_CONDICION[0] as string, [Validators.required]],
    formatoCurricular: [OPCIONES_FORMATO_CURRICULAR[2] as string, [Validators.required]],

    // ── Carga horaria ────────────────────────────────────────────────────
    horasSemanales: ['', [Validators.required]],
    horasCuatrimestrales: ['', [Validators.required]],

    // ── Fundamentación ───────────────────────────────────────────────────
    // Es la sección 1 del PDF que arma el backend. Obligatoria: si va vacía,
    // el documento sale con su primer título sin texto abajo.
    fundamentacion: ['', [Validators.required]],

    // ── Objetivos ────────────────────────────────────────────────────────
    objetivosGenerales: ['', [Validators.required]],
    objetivosEspecificos: ['', [Validators.required]],

    // ── Unidades de contenido ───────────────────────────────────────────
    contenidos: this.fb.array<GrupoUnidad>([this.crearGrupoUnidad()], [Validators.required]),

    // ── Metodología ──────────────────────────────────────────────────────
    estrategiasMetodologicas: ['', [Validators.required]],
    estrategiasAcompanamientoVirtualRemoto: [''],

    // ── Evaluación ───────────────────────────────────────────────────────
    evaluacion: ['', [Validators.required]],
    criteriosEvaluacion: ['', [Validators.required]],
    condicionRegular: ['', [Validators.required]],
    condicionPromocional: ['', [Validators.required]],
    condicionLibre: ['', [Validators.required]],
    examenesVirtuales: [''],
  });

  protected get contenidos(): FormArray<GrupoUnidad> {
    return this.formulario.controls.contenidos;
  }

  protected agregarUnidad(): void {
    this.contenidos.push(this.crearGrupoUnidad());
  }

  protected quitarUnidad(indice: number): void {
    // Siempre queda al menos una unidad: un programa sin contenido no tiene sentido.
    if (this.contenidos.length > 1) {
      this.contenidos.removeAt(indice);
    }
  }

  private crearGrupoUnidad(): GrupoUnidad {
    return this.fb.nonNullable.group({
      tituloUnidad: this.fb.nonNullable.control('', [Validators.required]),
      contenido: this.fb.nonNullable.control('', [Validators.required]),
      bibliografiaObligatoria: this.fb.nonNullable.control('', [Validators.required]),
      bibliografiaComplementaria: this.fb.nonNullable.control(''),
    });
  }

  protected enviar(): void {
    if (this.formulario.invalid || this.enviando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();

    const contenidos: ContenidoUnidad[] = valores.contenidos.map((unidad, indice) => ({
      unidad: indice + 1,
      tituloUnidad: unidad.tituloUnidad,
      contenido: unidad.contenido,
      bibliografiaObligatoria: unidad.bibliografiaObligatoria,
      bibliografiaComplementaria: unidad.bibliografiaComplementaria,
    }));

    const programa: ProgramaMateria = {
      idDocente: this.idDocente(),
      // El `<select>` devuelve el valor como texto aunque las opciones sean
      // números: sin `Number(...)` el backend recibe "7" y falla el binding.
      idMateria: Number(valores.idMateria),
      condicion: valores.condicion,
      fundamentacion: valores.fundamentacion,
      objetivosEspecificos: valores.objetivosEspecificos,
      objetivosGenerales: valores.objetivosGenerales,
      horasSemanales: valores.horasSemanales,
      horasCuatrimestrales: valores.horasCuatrimestrales,
      evaluacion: valores.evaluacion,
      criteriosEvaluacion: valores.criteriosEvaluacion,
      estrategiasMetodologicas: valores.estrategiasMetodologicas,
      estrategiasAcompanamientoVirtualRemoto: valores.estrategiasAcompanamientoVirtualRemoto,
      condicionRegular: valores.condicionRegular,
      condicionPromocional: valores.condicionPromocional,
      condicionLibre: valores.condicionLibre,
      examenesVirtuales: valores.examenesVirtuales,
      formatoCurricular: valores.formatoCurricular,
      cicloLectivo: valores.cicloLectivo,
      contenidos,
    };

    this.enviarPrograma.emit(programa);
  }
}
