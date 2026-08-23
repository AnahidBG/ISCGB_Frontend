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
 * ⚠️ `idDocente` e `idMateria` son campos numéricos manuales por ahora.
 * Lo correcto sería resolver `idDocente` a partir de la sesión activa y
 * elegir `idMateria` de una lista de materias a cargo del docente, pero
 * ninguna de las dos cosas tiene todavía un endpoint en el backend (no
 * existe `GET /api/Docentes/por-usuario/{idUsuario}` ni `GET /api/Materias`).
 * Hasta que existan, se cargan a mano.
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

  @Output() readonly enviarPrograma = new EventEmitter<ProgramaMateria>();

  protected readonly opcionesCondicion = OPCIONES_CONDICION;
  protected readonly opcionesFormatoCurricular = OPCIONES_FORMATO_CURRICULAR;

  protected readonly formulario = this.fb.nonNullable.group({
    // ── Identificación ──────────────────────────────────────────────────
    idDocente: [0, [Validators.required, Validators.min(1)]],
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
      idDocente: valores.idDocente,
      idMateria: valores.idMateria,
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
