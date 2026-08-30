import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { ROLES } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { JustificativosService } from '../../../core/justificativos/justificativos.service';
import {
  TIPOS_INASISTENCIA,
  exigeComprobante,
} from '../../../core/justificativos/modelos/tipo-inasistencia';
import { ENLACES_COMUNES } from '../../../shared/ui/estructura-panel/enlaces-comunes';
import {
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { ZonaArchivo } from '../../../shared/ui/zona-archivo/zona-archivo';

const MAXIMO_NOTA = 500;

/**
 * Carga de justificativo de inasistencia. La usan los cuatro roles, por eso
 * vive acá y no adentro de la carpeta de ninguno.
 *
 * Diferencias con el Figma, a propósito: agregué las fechas de inasistencia
 * (están en el DTO y sin eso Secretaría no sabe qué días justificar), y el
 * comprobante y la nota no son siempre obligatorios porque el backend
 * tampoco los exige siempre.
 *
 * La caja de adjuntar es `<app-zona-archivo>`, compartida con "Subir
 * Documento": ahí vive la validación de PDF y el tope de tamaño.
 */
@Component({
  selector: 'app-carga-justificativo',
  imports: [EstructuraPanel, Icono, ZonaArchivo],
  templateUrl: './carga-justificativo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargaJustificativo {
  private readonly auth = inject(AuthService);
  private readonly justificativos = inject(JustificativosService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly tipos = TIPOS_INASISTENCIA;
  protected readonly maximoNota = MAXIMO_NOTA;

  protected readonly rolPrincipal = computed(() => this.sesion()?.roles[0] ?? '');
  protected readonly rutaPanel = computed(() => destinoSegunRoles(this.sesion()));

  protected readonly tipoElegido = signal('');
  protected readonly fechaInicio = signal('');
  protected readonly fechaFin = signal('');
  protected readonly nota = signal('');
  protected readonly archivo = signal<File | null>(null);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Mensaje que devolvió el backend. `null` = todavía no se envió. */
  protected readonly mensajeExito = signal<string | null>(null);

  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const enlaces: EnlacePanel[] = [
      { etiqueta: 'Dashboard', url: this.rutaPanel(), icono: 'panel' },
    ];

    // Solo quien presenta documentación propia ve el acceso a subirla.
    if (tieneAlgunRol(this.sesion(), [ROLES.docente, ROLES.alumno])) {
      enlaces.push({
        etiqueta: 'Subir Documento',
        url: '/legajo/subir-documento',
        icono: 'subir',
      });
    }

    if (tieneAlgunRol(this.sesion(), [ROLES.secretario, ROLES.director])) {
      enlaces.push({
        etiqueta: 'Control de Legajos',
        url: '/secretario/control-legajos',
        icono: 'legajo',
      });
    }

    enlaces.push(...ENLACES_COMUNES);
    return enlaces;
  });

  /** `true` cuando el motivo elegido obliga a adjuntar el PDF. */
  protected readonly pideComprobante = computed(
    () => this.tipoElegido() !== '' && exigeComprobante(this.tipoElegido()),
  );

  /** La ayuda del motivo elegido, para mostrarla debajo del desplegable. */
  protected readonly ayudaDelTipo = computed(
    () => this.tipos.find((t) => t.valor === this.tipoElegido())?.ayuda ?? null,
  );

  protected readonly caracteresRestantes = computed(() => MAXIMO_NOTA - this.nota().length);

  /** Qué falta para poder enviar, o `null` si ya está. Es texto para poder mostrarlo. */
  protected readonly faltante = computed<string | null>(() => {
    if (this.tipoElegido() === '') {
      return 'Elegí el motivo de la inasistencia.';
    }
    if (this.fechaInicio() === '') {
      return 'Indicá desde qué día faltaste.';
    }
    if (this.fechaFin() !== '' && this.fechaFin() < this.fechaInicio()) {
      return 'La fecha de fin no puede ser anterior a la de inicio.';
    }
    if (this.pideComprobante() && this.archivo() === null) {
      return 'Este motivo necesita que adjuntes el comprobante en PDF.';
    }
    if (this.nota().length > MAXIMO_NOTA) {
      return `La nota no puede superar los ${MAXIMO_NOTA} caracteres.`;
    }
    return null;
  });

  protected readonly puedeEnviar = computed(
    () => this.faltante() === null && !this.enviando(),
  );

  protected alElegirTipo(evento: Event): void {
    this.tipoElegido.set((evento.target as HTMLSelectElement).value);

    // El archivo que ya estaba cargado se manda igual aunque el motivo nuevo
    // no lo pida: el backend lo acepta.
    this.error.set(null);
  }

  protected alElegirInicio(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.fechaInicio.set(valor);

    // Lo normal es faltar un día solo, así que autocompleto el fin.
    if (this.fechaFin() === '') {
      this.fechaFin.set(valor);
    }
  }

  protected alElegirFin(evento: Event): void {
    this.fechaFin.set((evento.target as HTMLInputElement).value);
  }

  protected alEscribirNota(evento: Event): void {
    this.nota.set((evento.target as HTMLTextAreaElement).value);
  }

  protected alElegirArchivo(archivo: File): void {
    this.archivo.set(archivo);
    this.error.set(null);
  }

  protected quitarArchivo(): void {
    this.archivo.set(null);
    this.error.set(null);
  }

  protected enviar(): void {
    const idUsuario = this.sesion()?.idUsuario;

    if (idUsuario === undefined || !this.puedeEnviar()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.justificativos
      .cargar({
        idUsuario,
        tipoInasistencia: this.tipoElegido(),
        notaAdicional: this.nota().trim() === '' ? null : this.nota().trim(),
        fechaInasistenciaInicio: aFecha(this.fechaInicio()),
        // Sin fecha de fin, se manda el mismo día que el inicio.
        fechaInasistenciaFin: aFecha(this.fechaFin() || this.fechaInicio()),
        documentoPdf: this.archivo(),
      })
      .subscribe({
        next: (mensaje) => {
          this.enviando.set(false);
          this.mensajeExito.set(mensaje);
        },
        error: (fallo: Error) => {
          this.enviando.set(false);
          this.error.set(fallo.message);
        },
      });
  }

  protected cargarOtro(): void {
    this.tipoElegido.set('');
    this.fechaInicio.set('');
    this.fechaFin.set('');
    this.nota.set('');
    this.archivo.set(null);
    this.mensajeExito.set(null);
    this.error.set(null);
  }

  protected volverAlPanel(): void {
    this.router.navigate([this.rutaPanel()]);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

}

/**
 * El input date da "2026-08-27". Hay que agregarle la hora o `new Date` lo
 * toma como UTC y en Argentina el día se corre para atrás.
 */
function aFecha(valor: string): Date | null {
  return valor === '' ? null : new Date(`${valor}T00:00:00`);
}
