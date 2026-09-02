import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { inicialesDe, normalizarTexto } from '../../../core/comun/texto';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { ResumenUsuarioLegajo } from '../../../core/legajos/modelos/resumen-usuario-legajo';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import {
  EstructuraPanel,
  NotificacionPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { MAXIMO_NOTIFICACIONES } from '../../../shared/ui/estructura-panel/notificaciones-legajo';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/**
 * Control de Legajos → "Ver Legajos": la lista de PERSONAS del instituto,
 * para que Secretaría o Dirección encuentre a alguien puntual sin tener que
 * revisar una lista plana de documentos sueltos.
 *
 * ── Reestructuración del 01/09/2026 ────────────────────────────────────────
 * Antes esta pantalla mostraba, en la vista "Cards" (la que arrancaba por
 * defecto), el detalle documento por documento de TODAS las personas del
 * instituto al mismo tiempo — con los botones de aprobar/rechazar ahí mismo.
 * Eso generaba justo la sobrecarga visual que pidieron resolver: decenas de
 * documentos de distintas personas mezclados en la misma pantalla.
 *
 * Ahora esta vista SOLO lista personas (nombre, DNI, conteos por estado). La
 * revisión — ver cada documento, aprobar, rechazar — pasó al perfil
 * individual (`/legajo/usuario/:idUsuario`, componente `MisDocumentos`, ver
 * el comentario "Auditoría" ahí). Ningún documento aprobado o rechazado
 * desapareció: siguen existiendo y siguen siendo consultables, solo cambió
 * DÓNDE se muestran.
 *
 * También cambió de dónde sale la lista: antes usaba
 * `obtenerResumenInstitucional()` (`GET /api/Legajos/resumen-estado`), que
 * manda la lista COMPLETA de documentos de TODOS los usuarios solo para
 * poder contar cuántos están aprobados/pendientes/rechazados acá. Ahora usa
 * `obtenerResumenUsuarios()` (`GET /api/Legajos/resumen-usuarios`), que ya
 * viene con los conteos calculados y no trae ni un documento — la carga de
 * esta pantalla es liviana, y el legajo completo de una persona se pide
 * recién al abrir su perfil.
 *
 * Contenedor: es el único que conoce `LegajoService`; no le queda ninguna
 * lógica de auditoría — esa vive en `MisDocumentos` ahora.
 */
@Component({
  selector: 'app-control-legajos',
  imports: [EstructuraPanel, PantallaCarga, RouterLink, Icono],
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


  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */

  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  protected readonly resumen = signal<ResumenUsuarioLegajo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Filtro de texto: nombre o DNI. Vacío muestra todo. */
  protected readonly busqueda = signal('');

  /** `true` esconde a quien no tenga ningún documento esperando revisión. */
  protected readonly soloPendientes = signal(false);

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /**
   * Cómo se dibuja la lista de personas: tabla, tarjetas o compacto. Las tres
   * vistas muestran lo mismo (persona + conteos, sin documentos sueltos);
   * cambia solo la densidad.
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
    this.resumen().reduce((total, usuario) => total + usuario.pendientes, 0),
  );

  /**
   * El detalle que se despliega al tocar la campana: quiénes tienen
   * documentos esperando revisión, de mayor a menor. Cada fila abre el perfil
   * de esa persona, que es donde ahora se aprueba o se rechaza.
   */
  protected readonly notificacionesDetalle = computed<NotificacionPanel[]>(() =>
    [...this.resumen()]
      .filter((usuario) => usuario.pendientes > 0)
      .sort((a, b) => b.pendientes - a.pendientes)
      .slice(0, MAXIMO_NOTIFICACIONES)
      .map((usuario) => ({
        titulo: usuario.nombreCompleto,
        detalle: `${usuario.pendientes} ${
          usuario.pendientes === 1 ? 'documento espera' : 'documentos esperan'
        } revisión`,
        url: `/legajo/usuario/${usuario.idUsuario}`,
        tono: 'pendiente' as const,
      })),
  );

  /**
   * Lo que se dibuja, filtrado y ordenado. El orden importa: el endpoint
   * devuelve todos los usuarios, muchos sin ningún documento.
   */
  protected readonly usuariosFiltrados = computed(() => {
    const texto = normalizarTexto(this.busqueda());
    const soloPendientes = this.soloPendientes();

    const filtrados = this.resumen().filter((usuario) => {
      if (soloPendientes && usuario.pendientes === 0) {
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
      // 1° quien tiene documentos esperando revisión (y quien tiene más).
      if (a.pendientes !== b.pendientes) {
        return b.pendientes - a.pendientes;
      }
      // 2° quien al menos subió algo, antes que las fichas vacías.
      if (a.total !== b.total) {
        return b.total - a.total;
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

    this.legajoService.obtenerResumenUsuarios().subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.cargando.set(false);
      },
    });
  }

  protected readonly iniciales = inicialesDe;

  protected alternarSoloPendientes(): void {
    this.soloPendientes.update((valor) => !valor);
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
 * guardado, arranca en "cards" — tarjetas con los conteos por persona, el
 * comportamiento de siempre (lo que cambió es que "cards" ya no dibuja los
 * documentos sueltos de cada una, ver el comentario del componente).
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
