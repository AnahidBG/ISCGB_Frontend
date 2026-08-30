import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { tamanoLegible, validarArchivoPdf } from '../../../core/comun/archivos';
import { Icono } from '../icono/icono';

/**
 * La caja para adjuntar un PDF: arrastrar o tocar para elegir, y la tarjeta
 * con el archivo ya elegido.
 *
 * Presentacional: no sabe a qué endpoint va el archivo ni qué formulario lo
 * contiene. Solo avisa qué eligió la persona.
 *
 * Estaba copiado entre "Subir Documento" y "Justificar Inasistencia" — unas
 * 80 líneas entre el HTML y los cuatro manejadores de arrastre. Acá vive una
 * sola vez, así que la próxima pantalla que necesite adjuntar algo son tres
 * líneas de template.
 *
 * La validación (solo PDF, 10 MB) la hace el componente y no quien lo usa,
 * porque es una regla de TODO el sistema —la regla de negocio #1— no de una
 * pantalla en particular. Si cambia, cambia en `core/comun/archivos.ts`.
 */
@Component({
  selector: 'app-zona-archivo',
  imports: [Icono],
  templateUrl: './zona-archivo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZonaArchivo {
  /** El archivo ya elegido, o `null` para mostrar la zona vacía. */
  readonly archivo = input<File | null>(null);

  /** En escritorio se arrastra; en celular se toca. Por eso son dos textos. */
  readonly textoArrastrar = input<string>('Arrastrá tu archivo acá');
  readonly textoTocar = input<string>('Elegí tu archivo');

  /** El archivo pasó la validación. */
  readonly elegido = output<File>();

  /** La persona lo sacó. */
  readonly quitado = output<void>();

  /** No pasó la validación. Emite el mensaje para mostrar. */
  readonly rechazado = output<string>();

  protected readonly arrastrando = signal(false);

  protected readonly tamano = computed(() => {
    const archivo = this.archivo();
    return archivo === null ? '' : tamanoLegible(archivo);
  });

  protected alSeleccionar(evento: Event): void {
    this.tomar((evento.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected alArrastrarEncima(evento: DragEvent): void {
    // Sin esto el navegador abre el PDF en vez de dárnoslo.
    evento.preventDefault();
    this.arrastrando.set(true);
  }

  protected alSalir(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
  }

  protected alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    this.tomar(evento.dataTransfer?.files?.[0] ?? null);
  }

  protected quitar(): void {
    this.quitado.emit();
  }

  private tomar(archivo: File | null): void {
    if (archivo === null) {
      return;
    }

    const error = validarArchivoPdf(archivo);

    if (error !== null) {
      this.rechazado.emit(error);
      return;
    }

    this.elegido.emit(archivo);
  }
}
