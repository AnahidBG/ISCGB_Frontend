import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { consultaConTipo } from '../../../core/legajos/tipo-en-url';
import { Icono } from '../icono/icono';

/**
 * La documentación que falta por entregar, a la vista en el panel (SCRUM-150).
 *
 * Antes el dato estaba, pero repartido: la campana tiraba un aviso por
 * documento, "Próximos pasos" decía CUÁNTOS faltaban pero no cuáles, y el
 * mapa del trámite los listaba plegado. Acá se ve de una qué falta y cada uno
 * lleva a subirlo.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): recibe la
 * lista ya calculada por `obligatoriosSinCargar` y no pide nada a la red.
 * Con la lista vacía no tiene nada que decir: el contenedor no la dibuja.
 *
 * Está en `shared/ui/` porque la usan los paneles de Docente y de Alumno.
 */
@Component({
  selector: 'app-documentacion-por-entregar',
  imports: [RouterLink, Icono],
  templateUrl: './documentacion-por-entregar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentacionPorEntregar {
  readonly documentos = input.required<readonly DocumentoRequerido[]>();

  /** Cada documento con el `?tipo=` de su "Subir": abre el formulario con ese tipo elegido. */
  protected readonly filas = computed(() =>
    this.documentos().map((documento) => ({
      documento,
      consulta: consultaConTipo(documento.idTipoDoc),
    })),
  );

  /** El mismo texto que el aviso de la campana y el mail de SCRUM-156. */
  protected readonly indicacion = computed(() =>
    this.documentos().length === 1
      ? 'Cargalo desde Subir Documento y entregalo en papel en Secretaría.'
      : 'Cargalos desde Subir Documento y entregalos en papel en Secretaría.',
  );
}
