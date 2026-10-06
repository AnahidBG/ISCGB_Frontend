import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AsignacionMateria,
  ComisionDisponible,
  DocenteDisponible,
} from '../../../../../core/materias/modelos/asignacion-materia';
import { MateriaDisponible } from '../../../../../core/materias/modelos/materia-disponible';

/** Los tres desplegables son obligatorios, con su mensaje si quedan sin elegir. */
const OBLIGATORIOS = {
  idDocente: 'Elegí el docente.',
  idMateria: 'Elegí la materia.',
  idComision: 'Elegí la comisión.',
} as const;

type Campo = keyof typeof OBLIGATORIOS;

/**
 * Asignar una materia a un docente en una comisión
 * (`POST /api/Materias/asignar`).
 *
 * PRESENTACIONAL: recibe las tres listas del contenedor y emite los tres ids.
 * La asignación es lo que después le aparece al docente en "Entregar
 * programa de materia" (`contexto-docente`), con su comisión.
 */
@Component({
  selector: 'app-formulario-asignacion',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-asignacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioAsignacion {
  private readonly fb = inject(FormBuilder);

  readonly docentes = input<readonly DocenteDisponible[]>([]);
  readonly materias = input<readonly MateriaDisponible[]>([]);
  readonly comisiones = input<readonly ComisionDisponible[]>([]);
  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly exito = input<string | null>(null);

  /** Cada vez que cambia, los desplegables vuelven a "Elegí…". */
  readonly reinicio = input(0);

  readonly asignar = output<AsignacionMateria>();

  protected readonly seIntentoEnviar = signal(false);

  /** Los `<select>` trabajan con texto: el id se pasa a número recién al emitir. */
  protected readonly formulario = this.fb.nonNullable.group({
    idDocente: ['', Validators.required],
    idMateria: ['', Validators.required],
    idComision: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      this.reinicio();
      untracked(() => {
        this.formulario.reset();
        this.seIntentoEnviar.set(false);
      });
    });
  }

  protected errorDe(campo: Campo): string | null {
    return this.seIntentoEnviar() && this.formulario.controls[campo].value === ''
      ? OBLIGATORIOS[campo]
      : null;
  }

  protected enviar(): void {
    this.seIntentoEnviar.set(true);
    if (this.formulario.invalid || this.enviando()) {
      return;
    }

    const v = this.formulario.getRawValue();
    this.asignar.emit({
      idDocente: Number(v.idDocente),
      idMateria: Number(v.idMateria),
      idComision: Number(v.idComision),
    });
  }
}
