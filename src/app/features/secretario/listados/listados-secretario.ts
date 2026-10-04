import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import {
  filtrarUsuarios,
  FiltroEstadoUsuario,
  FiltroRolUsuario,
  ROLES_LISTADO_SECRETARIO,
} from '../../../core/usuarios/filtrar-usuarios';
import { UsuarioInstitucional } from '../../../core/usuarios/modelos/usuario-institucional';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

@Component({
  selector: 'app-listados-secretario',
  imports: [EstructuraPanel, PantallaCarga],
  templateUrl: './listados-secretario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListadosSecretario {
  private readonly auth = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly texto = signal('');
  protected readonly rol = signal<FiltroRolUsuario>('todos');
  protected readonly estado = signal<FiltroEstadoUsuario>('activos');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly usuarios = signal<UsuarioInstitucional[]>([]);

  protected readonly listado = computed(() =>
    filtrarUsuarios(this.usuarios(), {
      texto: this.texto(),
      rol: this.rol(),
      estado: this.estado(),
    }).filter((usuario) => usuario.roles.some((rol) => ROLES_LISTADO_SECRETARIO.includes(rol))),
  );

  constructor() {
    this.cargar();
    this.campana.refrescar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.usuariosService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos traer el listado de alumnos y docentes.');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarTexto(valor: string): void {
    this.texto.set(valor);
  }

  protected cambiarRol(valor: string): void {
    this.rol.set((valor === 'Docente' || valor === 'Alumno' ? valor : 'todos') as FiltroRolUsuario);
  }

  protected cambiarEstado(valor: string): void {
    this.estado.set(
      valor === 'activos' || valor === 'inactivos' ? valor : 'todos',
    );
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
