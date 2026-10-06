import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FaseLegajo } from '../../../core/legajos/legajo-propio';
import { MENSAJE_ERROR_LEGAJO } from '../../../core/legajos/legajo.service';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { consultaConTipo } from '../../../core/legajos/tipo-en-url';
import { Icono, NombreIcono } from '../icono/icono';

/** Lo que la tarjeta tiene para decir: la fase del pedido y, ya listo, si quedó algo. */
type Situacion = 'cargando' | 'error' | 'al-dia' | 'por-entregar';

interface AparienciaSituacion {
  borde: string;
  icono: NombreIcono;
  /** El color de estado va solo en el ícono: como texto no llega a contraste AA. */
  colorIcono: string;
}

/** Tabla por clave: cómo se ve la tarjeta en cada situación. */
const APARIENCIA_POR_SITUACION: Record<Situacion, AparienciaSituacion> = {
  cargando: { borde: 'border-borde', icono: 'reloj', colorIcono: 'text-texto-suave' },
  error: { borde: 'border-rechazado/30', icono: 'alerta', colorIcono: 'text-rechazado' },
  'al-dia': { borde: 'border-aprobado/30', icono: 'aprobado', colorIcono: 'text-aprobado' },
  'por-entregar': { borde: 'border-pendiente/30', icono: 'alerta', colorIcono: 'text-pendiente' },
};

/**
 * La documentación que falta por entregar, a la vista en el panel (SCRUM-150).
 *
 * Antes el dato estaba, pero repartido: la campana tiraba un aviso por
 * documento, "Próximos pasos" decía CUÁNTOS faltaban pero no cuáles, y el
 * mapa del trámite los listaba plegado. Acá se ve de una qué falta y cada uno
 * lleva a subirlo.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): recibe la
 * lista ya calculada por `obligatoriosSinCargar` y la fase del pedido, y no
 * pide nada a la red. Dibuja cuatro situaciones: cargando, error (con
 * "Reintentar", que solo avisa al contenedor), al día y la lista.
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

  /** En qué anda el pedido del legajo. Por defecto, ya llegó. */
  readonly fase = input<FaseLegajo>('listo');

  /** Qué decir si falló. Sin esto, el mensaje genérico del legajo. */
  readonly mensajeError = input<string | null>(null);

  /** Se tocó "Reintentar": el contenedor vuelve a pedir el legajo. */
  readonly reintentar = output<void>();

  protected readonly situacion = computed<Situacion>(() => {
    const fase = this.fase();
    if (fase !== 'listo') {
      return fase;
    }
    return this.documentos().length === 0 ? 'al-dia' : 'por-entregar';
  });

  protected readonly apariencia = computed(() => APARIENCIA_POR_SITUACION[this.situacion()]);

  protected readonly textoError = computed(() => this.mensajeError() ?? MENSAJE_ERROR_LEGAJO);

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
