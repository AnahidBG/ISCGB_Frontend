import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { LegajoResumenUsuario } from '../../../core/legajos/modelos/legajo-resumen';
import { estadoGeneralDelLegajo } from '../../../core/legajos/resumen-legajo';
import { UsuarioInstitucional } from '../../../core/usuarios/modelos/usuario-institucional';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import {
  AccionPanel,
  EstructuraPanel,
  NotificacionPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { MAXIMO_NOTIFICACIONES } from '../../../shared/ui/estructura-panel/notificaciones-legajo';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/**
 * El botón verde del encabezado. Dar de alta a alguien es LA acción del
 * Director (ISCGB-PROJECT.md → Sprint 2), así que va acá arriba y no
 * escondida en el menú.
 */
const ACCION_DIRECTOR: AccionPanel = {
  etiqueta: 'Nuevo Usuario',
  url: '/director/usuarios/nuevo',
  icono: 'usuarios',
};

/**
 * Panel del Director.
 *
 * Es la vista con más alcance del sistema: lista a todo el instituto — con
 * el estado de su cuenta y de su legajo — y es la puerta de entrada a la
 * gestión de usuarios (Sprint 2, SCRUM-16: alta, modificación y baja).
 *
 * Los datos son reales y salen de DOS endpoints que se cruzan acá:
 *
 *   · `GET /api/Usuarios`               → quién es, roles, cuenta activa/inactiva
 *   · `GET /api/Legajos/resumen-estado` → sus documentos, para el estado del legajo
 *
 * Antes la columna "Legajo" quedaba vacía para todos con el cartel "el
 * estado del legajo todavía no llega desde el sistema" — pero
 * `resumen-estado` ya existía y trae los documentos de cada persona. Si
 * ese segundo pedido falla, el listado se muestra igual, sin el estado.
 *
 * Multi-rol: si la sesión tiene ADEMÁS el rol Docente (un director que
 * también dicta una materia), el menú suma "Entregar programa de materia" —
 * lo resuelve `enlacesPorSesion`, no este componente.
 */
@Component({
  selector: 'app-panel-director',
  imports: [EstructuraPanel, InsigniaEstado, PantallaCarga, RouterLink],
  templateUrl: './panel-director.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDirector {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly legajoService = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */

  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  /**
   * `undefined` mientras carga, `null` si falló, la lista si llegó.
   *
   * `toSignal`: se pide una sola vez, al entrar, sin manejar la suscripción
   * a mano. El legajo se pide en paralelo y, si falla, cada fila queda sin
   * estado en vez de tirar abajo el listado entero.
   */
  private readonly datos = toSignal(
    forkJoin({
      usuarios: this.usuariosService.listar(),
      legajos: this.legajoService
        .obtenerResumenInstitucional()
        .pipe(catchError(() => of<LegajoResumenUsuario[] | null>(null))),
    }).pipe(
      map(({ usuarios, legajos }) => ({
        usuarios: conEstadoDeLegajo(usuarios, legajos),
        legajoDisponible: legajos !== null,
      })),
      catchError(() => of(null)),
    ),
  );

  protected readonly cargando = computed(() => this.datos() === undefined);
  protected readonly errorCarga = computed(() => this.datos() === null);
  protected readonly legajoDisponible = computed(() => this.datos()?.legajoDisponible ?? true);

  protected readonly listadoUsuarios = computed(() => this.datos()?.usuarios ?? []);

  protected readonly accion = ACCION_DIRECTOR;

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  protected readonly resumen = computed(() => {
    const usuarios = this.listadoUsuarios();

    return {
      total: usuarios.length,
      inactivos: usuarios.filter((usuario) => !usuario.activo).length,
      aprobados: usuarios.filter((usuario) => usuario.estadoLegajo === 'Aprobado').length,
      pendientes: usuarios.filter((usuario) => usuario.estadoLegajo === 'Pendiente').length,
      rechazados: usuarios.filter((usuario) => usuario.estadoLegajo === 'Rechazado').length,
    };
  });

  /**
   * Enciende el puntito rojo de la campana con los legajos pendientes de
   * todo el instituto. Antes esta pantalla no le pasaba ningún número a
   * `EstructuraPanel`, así que la campana nunca se encendía acá.
   */
  protected readonly notificaciones = computed(() => this.resumen().pendientes);

  /**
   * El detalle que se despliega al tocar la campana: qué personas tienen el
   * legajo esperando revisión. Cada fila lleva a Control de Legajos, que es
   * donde se resuelve.
   */
  protected readonly notificacionesDetalle = computed<NotificacionPanel[]>(() =>
    this.listadoUsuarios()
      .filter((usuario) => usuario.estadoLegajo === 'Pendiente')
      .slice(0, MAXIMO_NOTIFICACIONES)
      .map((usuario) => ({
        titulo: `El legajo de ${usuario.nombreCompleto} espera revisión`,
        url: `/legajo/usuario/${usuario.idUsuario}`,
        tono: 'pendiente' as const,
      })),
  );

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}

/** Le pone a cada persona el estado general de su legajo, cruzando por `idUsuario`. */
function conEstadoDeLegajo(
  usuarios: UsuarioInstitucional[],
  legajos: LegajoResumenUsuario[] | null,
): UsuarioInstitucional[] {
  if (legajos === null) {
    return usuarios;
  }
  const porUsuario = new Map(legajos.map((legajo) => [legajo.idUsuario, legajo.documentos]));
  return usuarios.map((usuario) => ({
    ...usuario,
    estadoLegajo: estadoGeneralDelLegajo(porUsuario.get(usuario.idUsuario) ?? []),
  }));
}
