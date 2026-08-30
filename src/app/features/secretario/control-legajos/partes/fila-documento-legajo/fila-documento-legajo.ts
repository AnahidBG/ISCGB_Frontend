import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { urlArchivoSubido } from '../../../../../core/configuracion/api';
import { VeredictoLegajo } from '../../../../../core/legajos/legajo.service';
import { DocumentoResumenLegajo } from '../../../../../core/legajos/modelos/legajo-resumen';
import { InsigniaEstado } from '../../../../../shared/ui/insignia-estado/insignia-estado';

/** Lo que emite esta fila al aprobar o rechazar. */
export interface AuditoriaDocumentoEvento {
  veredicto: VeredictoLegajo;
  comentario: string | null;
}

/**
 * Una fila de Control de Legajos: el documento, su estado y los botones de
 * aprobar/rechazar. Presentacional, no sabe nada de red.
 *
 * El badge muestra el estado y los botones son la acción, así que no se
 * pisan: el botón que ya coincide con el estado actual queda relleno y
 * bloqueado, y el otro disponible para cambiarlo.
 *
 * Los botones tienen tres pintas: marco de color en reposo, relleno mientras
 * guarda, y relleno con brightness-90 cuando ya es el estado actual. Los
 * colores salen de los tokens del sistema de diseño.
 */
@Component({
  selector: 'app-fila-documento-legajo',
  imports: [InsigniaEstado],
  templateUrl: './fila-documento-legajo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilaDocumentoLegajo {
  readonly documento = input.required<DocumentoResumenLegajo>();

  /** El nombre ya resuelto. Lo calcula el contenedor, que es el que tiene el mapa. */
  readonly nombre = input.required<string>();

  /** `true` mientras esta fila puntual tiene un pedido en curso. */
  readonly guardando = input<boolean>(false);

  readonly auditar = output<AuditoriaDocumentoEvento>();

  /** `true` con el campo de motivo del rechazo desplegado. */
  protected readonly mostrandoMotivo = signal(false);
  protected readonly motivo = signal('');

  /** `true` con el cuadro de confirmación de aprobar desplegado. */
  protected readonly confirmandoAprobacion = signal(false);

  protected readonly urlArchivo = computed(() => urlArchivoSubido(this.documento().rutaArchivo));

  protected readonly yaAprobado = computed(() => this.documento().estado === 'Aprobado');
  protected readonly yaRechazado = computed(() => this.documento().estado === 'Rechazado');

  protected readonly clasesAprobar = computed(() => {
    if (this.guardando()) {
      return CLASES_APROBAR.guardando;
    }
    if (this.yaAprobado()) {
      return CLASES_APROBAR.confirmado;
    }
    return CLASES_APROBAR.reposo;
  });

  protected readonly clasesRechazar = computed(() => {
    if (this.guardando()) {
      return CLASES_RECHAZAR.guardando;
    }
    if (this.yaRechazado()) {
      return CLASES_RECHAZAR.confirmado;
    }
    return CLASES_RECHAZAR.reposo;
  });

  /**
   * Aprobar pide confirmación pero NO pide motivo: escribir por qué está bien
   * un documento que está bien es trabajo al pedo. El motivo es solo para
   * rechazar, que es lo que la persona tiene que poder corregir.
   */
  protected iniciarAprobacion(): void {
    if (this.guardando() || this.yaAprobado()) {
      return;
    }
    // Cierro el campo de rechazo por si quedó abierto con algo escrito.
    this.mostrandoMotivo.set(false);
    this.motivo.set('');
    this.confirmandoAprobacion.set(true);
  }

  protected cancelarAprobacion(): void {
    this.confirmandoAprobacion.set(false);
  }

  protected confirmarAprobacion(): void {
    this.confirmandoAprobacion.set(false);
    this.auditar.emit({ veredicto: 'Aprobado', comentario: null });
  }

  protected iniciarRechazo(): void {
    if (this.guardando() || this.yaRechazado()) {
      return;
    }
    this.confirmandoAprobacion.set(false);
    this.mostrandoMotivo.set(true);
  }

  protected cancelarRechazo(): void {
    this.mostrandoMotivo.set(false);
    this.motivo.set('');
  }

  protected confirmarRechazo(): void {
    const texto = this.motivo().trim();
    this.auditar.emit({ veredicto: 'Rechazado', comentario: texto.length > 0 ? texto : null });
    this.mostrandoMotivo.set(false);
    this.motivo.set('');
  }
}

const BASE_BOTON =
  'inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-xs font-semibold ' +
  'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 disabled:cursor-not-allowed sm:text-sm';

const CLASES_APROBAR = {
  reposo: `${BASE_BOTON} border-aprobado bg-transparent text-aprobado hover:bg-aprobado/10 active:bg-aprobado active:text-white focus-visible:ring-aprobado`,
  guardando: `${BASE_BOTON} border-aprobado bg-aprobado text-white focus-visible:ring-aprobado`,
  confirmado: `${BASE_BOTON} border-aprobado bg-aprobado text-white brightness-90 focus-visible:ring-aprobado`,
};

const CLASES_RECHAZAR = {
  reposo: `${BASE_BOTON} border-rechazado bg-transparent text-rechazado hover:bg-rechazado/10 active:bg-rechazado active:text-white focus-visible:ring-rechazado`,
  guardando: `${BASE_BOTON} border-rechazado bg-rechazado text-white focus-visible:ring-rechazado`,
  confirmado: `${BASE_BOTON} border-rechazado bg-rechazado text-white brightness-90 focus-visible:ring-rechazado`,
};
