import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { ROLES } from '../../../core/auth/modelos/rol';
import { Sesion, tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { ENLACES_COMUNES } from './enlaces-comunes';
import { EnlacePanel } from './estructura-panel';

/** Casos particulares que cambian qué enlaces arma `enlacesPorSesion`. */
export interface OpcionesEnlacesPorRol {
  /**
   * `true` cuando la pantalla actual es el legajo de OTRA persona (Secretaría
   * o Dirección revisando a alguien más, ruta `/legajo/usuario/:idUsuario`).
   *
   * En ese caso no tiene sentido ofrecer "Mi Legajo" ni "Subir Documento" —
   * son acciones sobre el legajo PROPIO de quien está mirando, no del que
   * está revisando.
   */
  legajoAjeno?: boolean;
}

/**
 * Arma el menú lateral que le corresponde a una sesión, en UN solo lugar.
 *
 * ── Por qué existe (28/08/2026) ─────────────────────────────────────────
 * Antes, cada pantalla (`PanelDirector`, `PanelSecretario`, `ControlLegajos`,
 * `MisDocumentos`, `Proximamente`, y los arreglos estáticos de `PanelDocente`
 * y `PanelAlumno`) armaba su PROPIA lista de enlaces, repitiendo a mano los
 * mismos condicionales de rol. Con la lógica duplicada en siete lugares,
 * alcanzaba con que uno se desactualizara — se agregaba un enlace en un panel
 * y no en los otros seis — para que una sección válida para la sesión
 * "desapareciera" al navegar de una pantalla a otra, sin que nadie tocara
 * permisos ni rutas: era pura desincronización entre copias de la misma
 * lista. Esta función es la ÚNICA fuente de verdad: cada pantalla le pasa su
 * sesión (y, si corresponde, `legajoAjeno`) y listo — agregar o sacar un
 * enlace para un rol se hace en un solo lugar y se refleja en todos los
 * paneles al mismo tiempo, así nunca más se puede desincronizar.
 *
 * El orden de los enlaces es siempre el mismo sin importar desde qué panel
 * se pida: Dashboard primero, después lo específico del rol de mayor a menor
 * alcance, y `ENLACES_COMUNES` al final — es lo que hace que el menú se vea
 * IDÉNTICO entre pantallas de un mismo usuario, que es justamente lo que
 * pide la persistencia de navegación.
 */
export function enlacesPorSesion(
  sesion: Sesion | null,
  opciones: OpcionesEnlacesPorRol = {},
): EnlacePanel[] {
  const enlaces: EnlacePanel[] = [
    { etiqueta: 'Dashboard', url: destinoSegunRoles(sesion), icono: 'panel' },
  ];

  if (tieneAlgunRol(sesion, [ROLES.director])) {
    enlaces.push({ etiqueta: 'Nuevo Usuario', url: '/director/usuarios/nuevo', icono: 'usuarios' });
  }

  if (tieneAlgunRol(sesion, [ROLES.director, ROLES.secretario])) {
    enlaces.push({ etiqueta: 'Control de Legajos', url: '/secretario/control-legajos', icono: 'legajo' });
  }

  // "Mi Legajo" y "Subir Documento" son del legajo PROPIO: no van cuando la
  // pantalla actual ya es el legajo de otra persona.
  if (tieneAlgunRol(sesion, [ROLES.docente, ROLES.alumno]) && !opciones.legajoAjeno) {
    enlaces.push({ etiqueta: 'Mi Legajo', url: '/legajo/mis-documentos', icono: 'legajo' });
    enlaces.push({ etiqueta: 'Subir Documento', url: '/legajo/subir-documento', icono: 'subir' });
  }

  // Sin `else`, a propósito: una sesión Director+Docente (el caso real de
  // "Dora Directora y Docente") tiene que ver ESTE enlace además de los de
  // arriba, no en lugar de ellos.
  if (tieneAlgunRol(sesion, [ROLES.docente])) {
    enlaces.push({
      etiqueta: 'Entregar programa de materia',
      url: '/docente/entrega-programa',
      icono: 'legajo',
    });
  }

  enlaces.push(...ENLACES_COMUNES);
  return enlaces;
}
