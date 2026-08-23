import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ProgramaMateria } from '../../../core/programas-materia/modelos/programa-materia';
import { ProgramasMateriaService } from '../../../core/programas-materia/programas-materia.service';
import { Boton } from '../../../shared/ui/boton/boton';
import { FormularioProgramaMateria } from './partes/formulario-programa-materia/formulario-programa-materia';

/**
 * Pantalla de entrega del programa de materia (Docente).
 *
 * Componente CONTENEDOR: es el único que conoce `ProgramasMateriaService`.
 * Coordina el envío y el estado de la pantalla (cargando, error, éxito);
 * el formulario en sí vive en `FormularioProgramaMateria`, que no sabe nada
 * de red.
 *
 *   EntregaPrograma            (contenedor) ← sabe del servicio
 *     └── FormularioProgramaMateria  (presentacional)
 *
 * El envío tiene dos pasos y el segundo depende del primero: el `POST`
 * devuelve el `idPrograma` que asignó el backend, y sin ese id no se puede
 * pedir el PDF. Por eso el id se guarda al recibirlo en vez de descartarlo.
 */
@Component({
  selector: 'app-entrega-programa',
  imports: [Boton, FormularioProgramaMateria],
  templateUrl: './entrega-programa.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntregaPrograma {
  private readonly programasMateria = inject(ProgramasMateriaService);

  /** `true` mientras esperamos la respuesta del servidor. */
  protected readonly enviando = signal(false);

  /** Mensaje de error del último intento, o `null` si no hubo. */
  protected readonly error = signal<string | null>(null);

  /** `true` una vez que el envío se completó con éxito. */
  protected readonly enviadoConExito = signal(false);

  /** Id que devolvió el backend al guardar. Es la llave para pedir el PDF. */
  protected readonly idPrograma = signal<number | null>(null);

  /** `true` mientras el backend arma el PDF. */
  protected readonly descargandoPdf = signal(false);

  /** Error de la última descarga de PDF, o `null`. */
  protected readonly errorPdf = signal<string | null>(null);

  protected manejarEnvio(programa: ProgramaMateria): void {
    this.enviando.set(true);
    this.error.set(null);

    this.programasMateria.enviarPrograma(programa).subscribe({
      next: (idPrograma) => {
        this.enviando.set(false);
        this.idPrograma.set(idPrograma);
        this.enviadoConExito.set(true);
      },
      error: (fallo: Error) => {
        this.enviando.set(false);
        this.error.set(fallo.message);
      },
    });
  }

  protected descargarPdf(): void {
    const id = this.idPrograma();
    if (id === null || this.descargandoPdf()) {
      return;
    }

    this.descargandoPdf.set(true);
    this.errorPdf.set(null);

    this.programasMateria.descargarPdf(id).subscribe({
      next: (archivo) => {
        this.descargandoPdf.set(false);
        guardarArchivo(archivo, `Programa_Materia_${id}.pdf`);
      },
      error: (fallo: Error) => {
        this.descargandoPdf.set(false);
        this.errorPdf.set(fallo.message);
      },
    });
  }

  /** Vuelve a mostrar el formulario para cargar otro programa. */
  protected cargarOtroPrograma(): void {
    this.enviadoConExito.set(false);
    this.idPrograma.set(null);
    this.errorPdf.set(null);
  }
}

/**
 * Dispara la descarga de un archivo que ya tenemos en memoria.
 *
 * El navegador no deja "guardar un Blob" directamente: hay que darle una URL
 * temporal que lo represente y simular el click en un enlace. Esa URL vive en
 * memoria hasta que se la revoca, así que se libera apenas se usa — si no, el
 * archivo entero queda retenido mientras la pestaña siga abierta.
 */
function guardarArchivo(archivo: Blob, nombre: string): void {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = nombre;
  enlace.click();

  URL.revokeObjectURL(url);
}
