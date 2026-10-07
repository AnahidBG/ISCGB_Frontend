import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RechazoVigente } from '../../../core/legajos/rechazos-legajo';
import { consultaConTipo } from '../../../core/legajos/tipo-en-url';
import { Icono } from '../icono/icono';
import { InsigniaEstado } from '../insignia-estado/insignia-estado';

/**
 * Los documentos rechazados que hay que corregir, a la vista en el panel
 * (SCRUM-152).
 *
 * Antes el rechazo estaba en la campana y, en el cuerpo del panel, era solo
 * un número ("2 documentos fueron rechazados"): para saber cuál y por qué
 * había que ir a Mis Documentos. Acá se ve cada uno con su motivo, y "Volver
 * a subir" abre el formulario con ese tipo de documento ya elegido.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): recibe la
 * lista ya resuelta por `rechazosVigentes` y no pide nada a la red. Con la
 * lista vacía no tiene nada que decir: el contenedor no la dibuja.
 *
 * Está en `shared/ui/` porque la usan los paneles de Docente y de Alumno.
 */
@Component({
  selector: 'app-documentos-rechazados',
  imports: [RouterLink, Icono, InsigniaEstado],
  templateUrl: './documentos-rechazados.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentosRechazados {
  readonly rechazos = input.required<readonly RechazoVigente[]>();

  /**
   * Cada rechazo con el `?tipo=` de su "Volver a subir". Sin tipo conocido va
   * `null` y el formulario abre sin ninguno elegido, como siempre.
   */
  protected readonly filas = computed(() =>
    this.rechazos().map((rechazo) => ({
      ...rechazo,
      consulta: rechazo.tipo === null ? null : consultaConTipo(rechazo.tipo.idTipoDoc),
    })),
  );
}
