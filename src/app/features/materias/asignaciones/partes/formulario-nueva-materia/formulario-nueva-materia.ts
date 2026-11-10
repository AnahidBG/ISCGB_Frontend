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
import { NuevaMateria } from '../../../../../core/materias/modelos/asignacion-materia';

/** Los tres campos son obligatorios, con el mensaje que se muestra si quedan vacíos. */
const OBLIGATORIOS = {
  nombre: 'Ingresá el nombre de la materia.',
  carrera: 'Ingresá la carrera.',
  curso: 'Elegí el curso.',
} as const;

type Campo = keyof typeof OBLIGATORIOS;

/**
 * Alta de una materia (`POST /api/Materias/cargar-materia`).
 *
 * PRESENTACIONAL: no conoce `MateriasService`. Emite la `NuevaMateria` ya
 * limpia y el contenedor decide qué hacer. Cuando el alta sale bien, el
 * contenedor incrementa `reinicio` y el formulario se vacía; si falla (nombre
 * repetido), los datos quedan para corregirlos.
 *
 * El curso se ELIGE de `cursos` (`GET /api/Materias/cursos`), no se escribe:
 * el límite de exámenes por día se cuenta por año y comisión, así que el
 * backend solo acepta los años de esa lista. Un valor que no está en la lista
 * cuenta como vacío.
 */
@Component({
  selector: 'app-formulario-nueva-materia',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-nueva-materia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioNuevaMateria {
  private readonly fb = inject(FormBuilder);

  /** Los cursos válidos, en el orden del backend. */
  readonly cursos = input<readonly string[]>([]);
  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly exito = input<string | null>(null);

  /** Cada vez que cambia, el formulario vuelve a quedar vacío. */
  readonly reinicio = input(0);

  readonly guardar = output<NuevaMateria>();

  protected readonly seIntentoEnviar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    carrera: ['', Validators.required],
    curso: ['', Validators.required],
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
    if (!this.seIntentoEnviar()) {
      return null;
    }
    const valor = this.formulario.controls[campo].value.trim();
    const falta = campo === 'curso' ? !this.cursos().includes(valor) : valor === '';
    return falta ? OBLIGATORIOS[campo] : null;
  }

  protected enviar(): void {
    this.seIntentoEnviar.set(true);
    const hayVacios = (Object.keys(OBLIGATORIOS) as Campo[]).some((c) => this.errorDe(c) !== null);
    if (hayVacios || this.enviando()) {
      return;
    }

    const v = this.formulario.getRawValue();
    this.guardar.emit({ nombre: v.nombre.trim(), carrera: v.carrera.trim(), curso: v.curso.trim() });
  }
}
