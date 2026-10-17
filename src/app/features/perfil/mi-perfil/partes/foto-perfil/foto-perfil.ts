import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ACEPTA_FOTO, validarFotoPerfil } from '../../../../../core/comun/archivos';
import { inicialesDe } from '../../../../../core/comun/texto';

/**
 * La foto de perfil y el botón para cambiarla.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el
 * servicio ni la sesión. Valida el archivo elegido con `validarFotoPerfil` (JPG o
 * PNG, hasta 2 MB) y, si está bien, avisa por `elegir`. Quien lo sube es `MiPerfil`.
 *
 * Sin foto, o si la imagen no carga, muestra las iniciales, igual que el encabezado.
 */
@Component({
  selector: 'app-foto-perfil',
  templateUrl: './foto-perfil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoPerfil {
  /** La URL de la foto actual (`Sesion.fotoUrl`), o `null` si no tiene. */
  readonly fotoUrl = input<string | null>(null);
  readonly nombreCompleto = input('');
  readonly subiendo = input(false);

  /** Por qué falló la subida, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);
  readonly confirmacion = input<string | null>(null);

  /** Se emite con el archivo ya validado. */
  readonly elegir = output<File>();

  protected readonly acepta = ACEPTA_FOTO;

  /** Por qué no sirve el archivo elegido, antes de mandarlo. */
  protected readonly errorArchivo = signal<string | null>(null);

  protected readonly iniciales = computed(() => inicialesDe(this.nombreCompleto()) || '?');

  /** La imagen no cargó: van las iniciales. Se reinicia con cada foto nueva. */
  protected readonly fotoRota = linkedSignal({ source: this.fotoUrl, computation: () => false });

  protected readonly fotoVisible = computed(() =>
    this.fotoRota() ? null : this.fotoUrl() || null,
  );

  /** El error que se muestra: primero el del archivo, después el del servidor. */
  protected readonly error = computed(() => this.errorArchivo() ?? this.errorServidor());

  protected alElegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    // Sin esto, elegir de nuevo el mismo archivo no dispara otro `change`.
    entrada.value = '';
    if (archivo === undefined) {
      return;
    }

    const error = validarFotoPerfil(archivo);
    this.errorArchivo.set(error);
    if (error === null) {
      this.elegir.emit(archivo);
    }
  }
}
