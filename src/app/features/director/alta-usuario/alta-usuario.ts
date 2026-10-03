import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { PerfilUsuario } from '../../../core/usuarios/modelos/perfil-usuario';
import { Provincia } from '../../../core/usuarios/modelos/provincia';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { FormularioPerfilUsuario } from '../partes/formulario-perfil-usuario/formulario-perfil-usuario';

/**
 * Alta de un usuario del instituto — Sprint 2, "Gestión de usuarios y roles"
 * (SCRUM-16, subtarea frontend SCRUM-130).
 *
 * CONTENEDOR: el formulario vive en `FormularioPerfilUsuario` (compartido con
 * "Editar Usuario"); acá solo se habla con `UsuariosService` y se decide qué
 * mostrar después.
 *
 * Es del Director y de nadie más: ISCGB-PROJECT.md le da a ese rol el
 * "alta/baja/modificación de usuarios y roles". La ruta está protegida con
 * `roleGuard(ROLES.director)` — y el backend tiene que protegerla con
 * `[Authorize(Roles = "Director")]` (hoy está comentado en el controlador).
 *
 * Pega contra `POST /api/UsuariosAdmin/alta`. Ese endpoint NO recibe
 * contraseña: la persona nace con la contraseña pendiente y el backend le
 * manda por correo un enlace (vence a los 20 días) para crearla en
 * `/crear-password`. Hasta que lo haga no puede entrar. La confirmación lo
 * dice, para que el Director no le prometa a nadie que ya puede ingresar.
 *
 * Si el enlace vence no hay forma de pedir otro: el backend todavía no tiene
 * endpoint para reenviarlo.
 */
@Component({
  selector: 'app-alta-usuario',
  imports: [EstructuraPanel, Icono, FormularioPerfilUsuario],
  templateUrl: './alta-usuario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AltaUsuario {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Quién se acaba de dar de alta y qué respondió el sistema, para la confirmación. */
  protected readonly recienCreado = signal<{ nombre: string; mensaje: string } | null>(null);

  // Las provincias para el desplegable: salen del backend con sus ids reales
  // (ver `UsuariosService.listarProvincias`). Si fallan, el formulario sigue
  // usable y avisa; la provincia es obligatoria, así que no se podrá guardar.
  protected readonly provincias = signal<readonly Provincia[]>([]);
  protected readonly cargandoProvincias = signal(true);
  protected readonly falloProvincias = signal(false);

  constructor() {
    this.campana.refrescar();
    this.usuarios.listarProvincias().subscribe({
      next: (provincias) => {
        this.provincias.set(provincias);
        this.cargandoProvincias.set(false);
      },
      error: () => {
        this.falloProvincias.set(true);
        this.cargandoProvincias.set(false);
      },
    });
  }

  protected crear(perfil: PerfilUsuario): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    this.usuarios.crear(perfil).subscribe({
      next: (mensaje) => {
        this.enviando.set(false);
        this.recienCreado.set({ nombre: `${perfil.nombre} ${perfil.apellido}`, mensaje });
      },
      error: (fallo: Error) => {
        this.enviando.set(false);
        this.error.set(fallo.message);
      },
    });
  }

  /** Vuelve a mostrar el formulario vacío para cargar a la persona siguiente. */
  protected cargarOtro(): void {
    this.recienCreado.set(null);
    this.error.set(null);
  }

  protected volverAlPanel(): void {
    this.router.navigate(['/director/panel']);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
