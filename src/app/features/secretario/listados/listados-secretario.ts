import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
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

/** El pedido del listado, con su fase (mismo criterio que `LegajoPropio`). */
type CargaUsuarios =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; usuarios: UsuarioInstitucional[] };

const CARGANDO: CargaUsuarios = { fase: 'cargando' };

const MENSAJE_ERROR_LISTADO = 'No pudimos traer el listado de alumnos y docentes.';

@Component({
  selector: 'app-listados-secretario',
  imports: [EstructuraPanel, PantallaCarga, RouterLink],
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

  /** Cada `next` vuelve a pedir el listado: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  /**
   * Las personas del instituto. Un fallo es una fase, no una excepción, y
   * `switchMap` descarta un pedido viejo si se reintenta antes de que vuelva.
   */
  protected readonly carga = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() =>
        this.usuariosService.listar().pipe(
          map((usuarios): CargaUsuarios => ({ fase: 'listo', usuarios })),
          catchError(() => of<CargaUsuarios>({ fase: 'error', mensaje: MENSAJE_ERROR_LISTADO })),
          startWith(CARGANDO),
        ),
      ),
    ),
    { initialValue: CARGANDO },
  );

  protected readonly errorCarga = computed(() => {
    const carga = this.carga();
    return carga.fase === 'error' ? carga.mensaje : null;
  });

  protected readonly listado = computed(() => {
    const carga = this.carga();
    const usuarios = carga.fase === 'listo' ? carga.usuarios : [];
    return filtrarUsuarios(usuarios, {
      texto: this.texto(),
      rol: this.rol(),
      estado: this.estado(),
    }).filter((usuario) => usuario.roles.some((rol) => ROLES_LISTADO_SECRETARIO.includes(rol)));
  });

  constructor() {
    this.campana.refrescar();
  }

  protected recargar(): void {
    this.reintento.next();
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
