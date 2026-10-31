import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  CampoNuevoContrato,
  ErroresNuevoContrato,
  aNuevoContrato,
  erroresDeNuevoContrato,
} from '../../../../../core/contratos/contratos-alumno';
import { NuevoContrato } from '../../../../../core/contratos/modelos/contrato-alumno';
import { UsuarioInstitucional } from '../../../../../core/usuarios/modelos/usuario-institucional';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';
import {
  clasesDelCampo,
  descripcionDelCampo,
} from '../../../../../shared/ui/campo-formulario/clases-del-campo';
import { ZonaArchivo } from '../../../../../shared/ui/zona-archivo/zona-archivo';

/**
 * Cargar un contrato en el perfil de un alumno: a quién, qué contrato es y el PDF.
 *
 * PRESENTACIONAL: recibe los alumnos del contenedor (`ContratosAlumnos`), avisa
 * qué alumno se eligió (para que el contenedor muestre sus contratos) y emite el
 * contrato ya validado (`erroresDeNuevoContrato`). Al reiniciarse conserva el
 * alumno, para poder cargarle otro contrato sin volver a buscarlo.
 */
@Component({
  selector: 'app-formulario-contrato',
  imports: [ReactiveFormsModule, CampoFormulario, Boton, ZonaArchivo],
  templateUrl: './formulario-contrato.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioContrato {
  private readonly fb = inject(FormBuilder);

  readonly alumnos = input<readonly UsuarioInstitucional[]>([]);

  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly exito = input<string | null>(null);

  /** Cada vez que cambia, se vacían el nombre y el archivo. */
  readonly reinicio = input(0);

  readonly guardar = output<NuevoContrato>();

  /** El alumno elegido, o `null` si se volvió a "Elegí un alumno". */
  readonly alumnoElegido = output<number | null>();

  protected readonly clasesDe = clasesDelCampo;
  protected readonly descripcionDe = descripcionDelCampo;

  protected readonly seIntentoGuardar = signal(false);
  protected readonly archivo = signal<File | null>(null);
  /** Lo que dijo `zona-archivo` al rechazar el último archivo elegido. */
  protected readonly archivoRechazado = signal<string | null>(null);

  protected readonly formulario = this.fb.nonNullable.group({ idUsuario: '', nombre: '' });

  constructor() {
    effect(() => {
      this.reinicio();
      untracked(() => {
        this.formulario.controls.nombre.reset();
        this.archivo.set(null);
        this.archivoRechazado.set(null);
        this.seIntentoGuardar.set(false);
      });
    });

    this.formulario.controls.idUsuario.valueChanges
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((id) => this.alumnoElegido.emit(id === '' ? null : Number(id)));
  }

  protected elegirArchivo(archivo: File): void {
    this.archivo.set(archivo);
    this.archivoRechazado.set(null);
  }

  protected quitarArchivo(): void {
    this.archivo.set(null);
  }

  protected rechazarArchivo(mensaje: string): void {
    this.archivo.set(null);
    this.archivoRechazado.set(mensaje);
  }

  private errores(): ErroresNuevoContrato {
    return erroresDeNuevoContrato({ ...this.formulario.getRawValue(), archivo: this.archivo() });
  }

  /** El error de un campo, solo después del primer intento de guardar. */
  protected errorDe(campo: CampoNuevoContrato): string | null {
    return this.seIntentoGuardar() ? (this.errores()[campo] ?? null) : null;
  }

  protected enviar(): void {
    this.seIntentoGuardar.set(true);
    if (Object.keys(this.errores()).length > 0 || this.enviando()) {
      return;
    }
    this.guardar.emit(
      aNuevoContrato({ ...this.formulario.getRawValue(), archivo: this.archivo() }),
    );
  }
}
