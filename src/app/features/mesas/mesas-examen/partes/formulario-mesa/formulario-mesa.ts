import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { aFechaSola } from '../../../../../core/comun/fechas';
import { TipoExamen } from '../../../../../core/examenes/modelos/tipo-examen';
import {
  ComisionDisponible,
  DocenteDisponible,
} from '../../../../../core/materias/modelos/asignacion-materia';
import { MateriaDisponible } from '../../../../../core/materias/modelos/materia-disponible';
import { NuevaMesa } from '../../../../../core/mesas/modelos/nueva-mesa';
import {
  CampoNuevaMesa,
  ErroresNuevaMesa,
  aNuevaMesa,
  erroresDeNuevaMesa,
} from '../../../../../core/mesas/nueva-mesa';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import {
  clasesDelCampo,
  descripcionDelCampo,
} from '../../../../../shared/ui/campo-formulario/clases-del-campo';

/**
 * El alta de una mesa de examen con el docente que la preside (SCRUM-245):
 * fecha, horario, materia, comisión, tipo de examen y docente. Todos son
 * obligatorios.
 *
 * PRESENTACIONAL: recibe las listas del contenedor (`MesasExamen`) y emite la
 * mesa ya validada (`erroresDeNuevaMesa`). Los errores de cada campo aparecen
 * recién al primer intento de guardar, para no retar antes de tiempo.
 */
@Component({
  selector: 'app-formulario-mesa',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-mesa.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioMesa {
  private readonly fb = inject(FormBuilder);

  readonly materias = input<readonly MateriaDisponible[]>([]);
  readonly comisiones = input<readonly ComisionDisponible[]>([]);
  readonly tipos = input<readonly TipoExamen[]>([]);
  readonly docentes = input<readonly DocenteDisponible[]>([]);

  /** El día de hoy: la fecha no puede ser anterior. */
  readonly hoy = input<Date>(new Date());

  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly exito = input<string | null>(null);

  /** Cada vez que cambia, el formulario vuelve a quedar vacío. */
  readonly reinicio = input(0);

  readonly guardar = output<NuevaMesa>();

  protected readonly clasesDe = clasesDelCampo;
  protected readonly descripcionDe = descripcionDelCampo;

  /** El `min` del campo fecha: la ayuda nativa del navegador. La regla de verdad es `erroresDeNuevaMesa`. */
  protected readonly fechaMinima = computed(() => aFechaSola(this.hoy()));

  protected readonly seIntentoGuardar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    dia: '',
    horario: '',
    idMateria: '',
    idComision: '',
    idTipoExamen: '',
    idDocente: '',
  });

  constructor() {
    effect(() => {
      this.reinicio();
      untracked(() => {
        this.formulario.reset();
        this.seIntentoGuardar.set(false);
      });
    });
  }

  private errores(): ErroresNuevaMesa {
    return erroresDeNuevaMesa(this.formulario.getRawValue(), this.hoy());
  }

  /** El error de un campo, solo después del primer intento de guardar. */
  protected errorDe(campo: CampoNuevaMesa): string | null {
    return this.seIntentoGuardar() ? (this.errores()[campo] ?? null) : null;
  }

  protected enviar(): void {
    this.seIntentoGuardar.set(true);
    if (Object.keys(this.errores()).length > 0 || this.enviando()) {
      return;
    }
    this.guardar.emit(aNuevaMesa(this.formulario.getRawValue()));
  }
}
