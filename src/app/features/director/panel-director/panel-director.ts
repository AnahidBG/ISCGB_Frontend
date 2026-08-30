import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { AccionPanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';

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
 * Es la vista con más alcance del sistema: lista a todo el instituto y el
 * estado de su legajo (ISCGB-PROJECT.md → permisos de Director,
 * "visualización global de alumnos, docentes y secretarios").
 *
 * ⚠️ Corre contra datos inventados. El backend todavía no expone un
 * endpoint para listar usuarios — ver docs/alcance-dashboard-director.md
 * para el detalle de esta decisión y qué falta para reemplazarla.
 *
 * Multi-rol: si la sesión tiene ADEMÁS el rol Docente (el caso real es un
 * director que también dicta una materia — hay un usuario de prueba para
 * esto, "Dora Directora y Docente" en `usuarios-de-prueba.ts`), el panel
 * agrega "Entregar programa de materia" al menú. No hay dos paneles ni una
 * fusión de pantallas: es el panel del rol de mayor alcance con los accesos
 * extra que los otros roles de esa sesión habilitan. Mismo criterio que ya
 * usaba `Inicio` con `puedeEntregarPrograma`.
 */
@Component({
  selector: 'app-panel-director',
  imports: [EstructuraPanel, InsigniaEstado],
  templateUrl: './panel-director.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelDirector {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /**
   * `toSignal`: el listado se pide una sola vez, al entrar a la pantalla, y
   * no hace falta manejar la suscripción a mano ni un `ngOnInit`. Mientras
   * no llega la respuesta, `listadoUsuarios()` es `[]` — no `undefined` —
   * así el template no necesita un `@if` extra para el primer render.
   */
  protected readonly listadoUsuarios = toSignal(this.usuariosService.listar(), {
    initialValue: [],
  });

  protected readonly accion = ACCION_DIRECTOR;

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  protected readonly resumen = computed(() => {
    const usuarios = this.listadoUsuarios();

    return {
      total: usuarios.length,
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

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
