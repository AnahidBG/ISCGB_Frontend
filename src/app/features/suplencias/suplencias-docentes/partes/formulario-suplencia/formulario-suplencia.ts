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
import { aFechaSola } from '../../../../../core/comun/fechas';
import { DocenteDisponible } from '../../../../../core/materias/modelos/asignacion-materia';
import { NuevaSuplencia } from '../../../../../core/suplencias/modelos/suplencia';
import {
  CampoNuevaSuplencia,
  ErroresNuevaSuplencia,
  aNuevaSuplencia,
  erroresDeNuevaSuplencia,
} from '../../../../../core/suplencias/nueva-suplencia';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import {
  clasesDelCampo,
  descripcionDelCampo,
} from '../../../../../shared/ui/campo-formulario/clases-del-campo';

/**
 * Asignar una suplencia: el docente, desde cuándo y, si se sabe, hasta cuándo.
 *
 * PRESENTACIONAL: recibe los docentes del contenedor (`SuplenciasDocentes`) y
 * emite la suplencia ya validada (`erroresDeNuevaSuplencia`). El inicio arranca
 * en hoy. Los errores aparecen recién al primer intento de guardar.
 */
@Component({
  selector: 'app-formulario-suplencia',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-suplencia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioSuplencia {
  private readonly fb = inject(FormBuilder);

  readonly docentes = input<readonly DocenteDisponible[]>([]);

  /** El día con el que arranca el campo "Desde". */
  readonly hoy = input<Date>(new Date());

  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly exito = input<string | null>(null);

  /** Cada vez que cambia, el formulario vuelve a quedar como al entrar. */
  readonly reinicio = input(0);

  readonly guardar = output<NuevaSuplencia>();

  protected readonly clasesDe = clasesDelCampo;
  protected readonly descripcionDe = descripcionDelCampo;

  protected readonly seIntentoGuardar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    idDocente: '',
    desde: '',
    hasta: '',
  });

  constructor() {
    effect(() => {
      this.reinicio();
      const hoy = aFechaSola(this.hoy());
      untracked(() => {
        this.formulario.reset({ idDocente: '', desde: hoy, hasta: '' });
        this.seIntentoGuardar.set(false);
      });
    });
  }

  private errores(): ErroresNuevaSuplencia {
    return erroresDeNuevaSuplencia(this.formulario.getRawValue());
  }

  /** El error de un campo, solo después del primer intento de guardar. */
  protected errorDe(campo: CampoNuevaSuplencia): string | null {
    return this.seIntentoGuardar() ? (this.errores()[campo] ?? null) : null;
  }

  protected enviar(): void {
    this.seIntentoGuardar.set(true);
    if (Object.keys(this.errores()).length > 0 || this.enviando()) {
      return;
    }
    this.guardar.emit(aNuevaSuplencia(this.formulario.getRawValue()));
  }
}
