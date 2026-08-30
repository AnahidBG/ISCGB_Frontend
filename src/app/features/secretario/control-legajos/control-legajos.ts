import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { inicialesDe, normalizarTexto } from '../../../core/comun/texto';
import { LegajoService, VeredictoLegajo } from '../../../core/legajos/legajo.service';
import {
  DocumentoResumenLegajo,
  LegajoResumenUsuario,
} from '../../../core/legajos/modelos/legajo-resumen';
import {
  MapaTiposDocumento,
  aprenderNombresDeTipos,
  nombreTipoDocumento,
} from '../../../core/legajos/tipos-documento';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import {
  AuditoriaDocumentoEvento,
  FilaDocumentoLegajo,
} from './partes/fila-documento-legajo/fila-documento-legajo';

/** Conteo por estado de un usuario, para el resumen de su tarjeta. */
interface ConteoEstados {
  aprobados: number;
  pendientes: number;
  rechazados: number;
  /** Cualquier valor que no sea uno de los tres del semáforo — incluye `null`. */
  otros: number;
  total: number;
}

/**
 * Control de Legajos: los documentos de todo el instituto agrupados por
 * persona, para que Secretaría o Dirección los apruebe o rechace.
 *
 * Contenedor: es el único que conoce `LegajoService`; las filas son
 * presentacionales.
 *
 * Hace dos llamadas porque `resumen-estado` trae la estructura pero manda
 * `idTipoDoc` sin el nombre, y `pendientes` sí trae el nombre. Cruzándolas
 * por `idLegajo` se saca qué nombre va con cada id (ver `tipos-documento.ts`).
 *
 * No pongo barra de progreso porque `resumen-estado` no manda el rol de cada
 * persona, y sin eso no sé cuántos documentos le corresponden. Muestro los
 * conteos y listo, mejor que inventar un porcentaje.
 */
@Component({
  selector: 'app-control-legajos',
  imports: [EstructuraPanel, PantallaCarga, FilaDocumentoLegajo, RouterLink, Icono],
  templateUrl: './control-legajos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Mismo criterio que el menú de perfil de `EstructuraPanel`: un clic en
    // cualquier lado (o Escape) cierra el desplegable de "Vista del Panel".
    '(document:click)': 'cerrarMenuVista()',
    '(document:keydown.escape)': 'cerrarMenuVista()',
  },
})
export class ControlLegajos {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  protected readonly resumen = signal<LegajoResumenUsuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Nombres de tipo de documento aprendidos del cruce con `/pendientes`. */
  protected readonly nombresDeTipos = signal<MapaTiposDocumento>(new Map());

  /** Error de la última auditoría que falló, sin tapar la pantalla entera. */
  protected readonly errorAuditoria = signal<string | null>(null);

  /** `idLegajo` de los documentos con un pedido de auditoría en curso. */
  protected readonly guardando = signal<ReadonlySet<number>>(new Set());

  /** Filtro de texto: nombre o DNI. Vacío muestra todo. */
  protected readonly busqueda = signal('');

  /** `true` esconde a quien no tenga ningún documento esperando revisión. */
  protected readonly soloPendientes = signal(false);

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /**
   * Cómo se dibuja la lista de personas: tabla, tarjetas (el detalle con
   * cada documento, como siempre) o compacto (una línea por persona).
   *
   * Igual que `colapsado` en `EstructuraPanel`: se guarda en `localStorage`
   * del navegador para no repetir la elección cada vez que se entra acá.
   */
  protected readonly vistaPanel = signal<VistaPanel>(leerVistaPanelGuardada());
  protected readonly vistas = VISTAS_PANEL;
  protected readonly menuVistaAbierto = signal(false);

  protected elegirVista(vista: VistaPanel): void {
    this.vistaPanel.set(vista);
    guardarVistaPanel(vista);
    this.menuVistaAbierto.set(false);
  }

  protected alternarMenuVista(evento: Event): void {
    evento.stopPropagation();
    this.menuVistaAbierto.update((abierto) => !abierto);
  }

  protected cerrarMenuVista(): void {
    this.menuVistaAbierto.set(false);
  }

  /** Cuántos documentos hay esperando revisión en todo el instituto. */
  protected readonly totalPendientes = computed(() =>
    this.resumen().reduce(
      (total, usuario) =>
        total + usuario.documentos.filter((d) => d.estado === 'Pendiente').length,
      0,
    ),
  );

  /**
   * Lo que se dibuja, filtrado y ordenado. El orden importa: el endpoint
   * devuelve todos los usuarios, muchos sin ningún documento.
   */
  protected readonly usuariosFiltrados = computed(() => {
    const texto = normalizarTexto(this.busqueda());
    const soloPendientes = this.soloPendientes();

    const filtrados = this.resumen().filter((usuario) => {
      if (soloPendientes && !this.tienePendientes(usuario)) {
        return false;
      }
      if (texto === '') {
        return true;
      }
      return (
        normalizarTexto(usuario.nombreCompleto).includes(texto) || usuario.dni.includes(texto)
      );
    });

    return [...filtrados].sort((a, b) => {
      const pendientesA = this.conteos(a).pendientes;
      const pendientesB = this.conteos(b).pendientes;

      // 1° quien tiene documentos esperando revisión (y quien tiene más).
      if (pendientesA !== pendientesB) {
        return pendientesB - pendientesA;
      }
      // 2° quien al menos subió algo, antes que las fichas vacías.
      if (a.documentos.length !== b.documentos.length) {
        return b.documentos.length - a.documentos.length;
      }
      // 3° alfabético, para que el orden sea estable y predecible.
      return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es');
    });
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // En paralelo, no dependen entre sí. Si una falla, forkJoin corta: sin
    // el resumen no hay nada que dibujar, y sin los pendientes los nombres
    // salen del mapa hardcodeado sin que nadie se entere.
    forkJoin({
      resumen: this.legajoService.obtenerResumenInstitucional(),
      pendientes: this.legajoService.listarParaRevision(),
    }).subscribe({
      next: ({ resumen, pendientes }) => {
        this.resumen.set(resumen);
        this.nombresDeTipos.set(aprenderNombresDeTipos(resumen, pendientes));
        this.cargando.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.cargando.set(false);
      },
    });
  }

  protected nombreDelDocumento(documento: DocumentoResumenLegajo): string {
    return nombreTipoDocumento(documento.idTipoDoc, this.nombresDeTipos());
  }

  protected readonly iniciales = inicialesDe;

  protected conteos(usuario: LegajoResumenUsuario): ConteoEstados {
    const documentos = usuario.documentos;
    const aprobados = documentos.filter((d) => d.estado === 'Aprobado').length;
    const pendientes = documentos.filter((d) => d.estado === 'Pendiente').length;
    const rechazados = documentos.filter((d) => d.estado === 'Rechazado').length;
    const total = documentos.length;

    return {
      aprobados,
      pendientes,
      rechazados,
      otros: total - aprobados - pendientes - rechazados,
      total,
    };
  }

  protected tienePendientes(usuario: LegajoResumenUsuario): boolean {
    return usuario.documentos.some((documento) => documento.estado === 'Pendiente');
  }

  protected estaGuardando(idLegajo: number): boolean {
    return this.guardando().has(idLegajo);
  }

  protected alternarSoloPendientes(): void {
    this.soloPendientes.update((valor) => !valor);
  }

  protected onAuditar(
    usuario: LegajoResumenUsuario,
    documento: DocumentoResumenLegajo,
    evento: AuditoriaDocumentoEvento,
  ): void {
    const idAuditor = this.sesion()?.idUsuario;
    if (idAuditor === undefined) {
      return;
    }

    this.marcarGuardando(documento.idLegajo, true);
    this.errorAuditoria.set(null);

    this.legajoService
      .auditar(documento.idLegajo, evento.veredicto, idAuditor, evento.comentario)
      .subscribe({
        next: () =>
          this.aplicarVeredictoLocal(usuario.idUsuario, documento.idLegajo, evento.veredicto),
        error: (fallo: Error) => {
          this.errorAuditoria.set(fallo.message);
          this.marcarGuardando(documento.idLegajo, false);
        },
        complete: () => this.marcarGuardando(documento.idLegajo, false),
      });
  }

  /**
   * Actualiza el estado en memoria en vez de recargar todo el resumen, que
   * trae el instituto entero y haría parpadear las tarjetas que no cambiaron.
   */
  private aplicarVeredictoLocal(
    idUsuario: number,
    idLegajo: number,
    veredicto: VeredictoLegajo,
  ): void {
    this.resumen.update((lista) =>
      lista.map((usuario) => {
        if (usuario.idUsuario !== idUsuario) {
          return usuario;
        }
        return {
          ...usuario,
          documentos: usuario.documentos.map((documento) =>
            documento.idLegajo === idLegajo ? { ...documento, estado: veredicto } : documento,
          ),
        };
      }),
    );
  }

  private marcarGuardando(idLegajo: number, activo: boolean): void {
    this.guardando.update((actual) => {
      const siguiente = new Set(actual);
      if (activo) {
        siguiente.add(idLegajo);
      } else {
        siguiente.delete(idLegajo);
      }
      return siguiente;
    });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}

/** Cómo se dibuja la lista de personas en Control de Legajos. */
export type VistaPanel = 'tabla' | 'cards' | 'compacto';

export const VISTAS_PANEL: readonly { valor: VistaPanel; etiqueta: string }[] = [
  { valor: 'tabla', etiqueta: 'Tabla' },
  { valor: 'cards', etiqueta: 'Cards' },
  { valor: 'compacto', etiqueta: 'Compacto' },
];

/** Dónde se guarda la preferencia de vista. Ver el comentario de `vistaPanel`. */
const CLAVE_VISTA_PANEL = 'iscgb.controlLegajos.vista';

function esVistaPanelValida(valor: string | null): valor is VistaPanel {
  return valor === 'tabla' || valor === 'cards' || valor === 'compacto';
}

/**
 * Lee la vista guardada. Si `localStorage` no está disponible o no hay nada
 * guardado, arranca en "cards" — el detalle completo por persona, que es el
 * comportamiento de siempre.
 */
function leerVistaPanelGuardada(): VistaPanel {
  try {
    const valor = localStorage.getItem(CLAVE_VISTA_PANEL);
    return esVistaPanelValida(valor) ? valor : 'cards';
  } catch {
    return 'cards';
  }
}

function guardarVistaPanel(vista: VistaPanel): void {
  try {
    localStorage.setItem(CLAVE_VISTA_PANEL, vista);
  } catch {
    // Modo privado u otra restricción del navegador: la preferencia no
    // persiste, pero no es un error fatal.
  }
}
