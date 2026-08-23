import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ProgramaMateria } from '../../../core/programas-materia/modelos/programa-materia';
import { ProgramasMateriaService } from '../../../core/programas-materia/programas-materia.service';
import { Boton } from '../../../shared/ui/boton/boton';
import { FormularioProgramaMateria } from './formulario-programa-materia';

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
 * ⚠️ `POST /api/ProgramasMateria` todavía no existe en el backend, así que
 * hoy este componente trabaja siempre contra `ProgramasMateriaMockService`
 * (ver el interruptor en `app.config.ts`). El día que el endpoint esté
 * levantado, el cambio es una línea ahí — este archivo no se toca.
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

  protected manejarEnvio(programa: ProgramaMateria): void {
    this.enviando.set(true);
    this.error.set(null);

    this.programasMateria.enviarPrograma(programa).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviadoConExito.set(true);
      },
      error: (fallo: Error) => {
        this.enviando.set(false);
        this.error.set(fallo.message);
      },
    });
  }

  /** Vuelve a mostrar el formulario para cargar otro programa. */
  protected cargarOtroPrograma(): void {
    this.enviadoConExito.set(false);
  }
}
