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
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DocenteDisponible } from '../../../../../core/materias/modelos/asignacion-materia';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import {
  clasesDelCampo,
  descripcionDelCampo,
} from '../../../../../shared/ui/campo-formulario/clases-del-campo';

/**
 * Dar de baja la suplencia de un docente, cuando vuelve el titular.
 *
 * PRESENTACIONAL: solo elige al docente y lo emite. La confirmación y el pedido
 * los resuelve el contenedor (`SuplenciasDocentes`), porque la baja le quita el
 * acceso a la persona.
 */
@Component({
  selector: 'app-baja-suplencia',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './baja-suplencia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BajaSuplencia {
  private readonly fb = inject(FormBuilder);

  readonly docentes = input<readonly DocenteDisponible[]>([]);

  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly exito = input<string | null>(null);

  /** Cada vez que cambia, el desplegable vuelve a quedar sin elegir. */
  readonly reinicio = input(0);

  readonly darDeBaja = output<DocenteDisponible>();

  protected readonly clasesDe = clasesDelCampo;
  protected readonly descripcionDe = descripcionDelCampo;

  protected readonly seIntentoGuardar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({ idDocente: '' });

  constructor() {
    effect(() => {
      this.reinicio();
      untracked(() => {
        this.formulario.reset();
        this.seIntentoGuardar.set(false);
      });
    });
  }

  private elegido(): DocenteDisponible | null {
    const id = Number(this.formulario.controls.idDocente.value);
    return this.docentes().find((docente) => docente.idDocente === id) ?? null;
  }

  protected errorDocente(): string | null {
    return this.seIntentoGuardar() && this.elegido() === null ? 'Elegí el docente.' : null;
  }

  protected enviar(): void {
    this.seIntentoGuardar.set(true);
    const docente = this.elegido();
    if (docente === null || this.enviando()) {
      return;
    }
    this.darDeBaja.emit(docente);
  }
}
