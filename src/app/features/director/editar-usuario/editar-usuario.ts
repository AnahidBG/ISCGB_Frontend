import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES, Rol } from '../../../core/auth/modelos/rol';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { PerfilUsuario } from '../../../core/usuarios/modelos/perfil-usuario';
import { Provincia } from '../../../core/usuarios/modelos/provincia';
import { UsuarioDetalle } from '../../../core/usuarios/modelos/usuario-detalle';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import {
  FormularioPerfilUsuario,
  PerfilInicial,
} from '../partes/formulario-perfil-usuario/formulario-perfil-usuario';

/** Orden para elegir el rol que se muestra cuando la persona tiene más de uno. */
const ORDEN_DE_ROLES: readonly Rol[] = [
  ROLES.director,
  ROLES.secretario,
  ROLES.docente,
  ROLES.alumno,
];

/**
 * Editar Usuario — Sprint 2, "Gestión de usuarios y roles" (SCRUM-16):
 * modificación del perfil y BAJA.
 *
 * CONTENEDOR. El formulario es el mismo de "Nuevo Usuario"
 * (`FormularioPerfilUsuario`) en modo edición: DNI y rol fijos.
 *
 *   · Precarga: `GET /api/Usuarios/{id}` (real, en `main`).
 *   · Guardar: `PUT /api/UsuariosAdmin/modificar/{id}` (rama `CargaDeUsuarios`).
 *     Muestra "El perfil de X ha sido actualizado correctamente" (SCRUM-139).
 *   · Baja: `PUT /api/UsuariosAdmin/baja/{id}`. Es un cambio de estado a
 *     inactivo, nunca un borrado: los datos y la documentación histórica
 *     quedan (criterio de aceptación, SCRUM-135/143). No hay endpoint de
 *     reactivación, así que una cuenta dada de baja no ofrece "reactivar".
 *
 * ⚠️ Limitaciones del backend que la pantalla dice en voz alta en vez de
 * esconder (ver docs/alineacion-sprint-2.md):
 *   · El GET no devuelve CUIL, género, afiliación ni si es director
 *     suplente: esos campos se vuelven a cargar al editar.
 *   · El PUT hoy guarda solo nombre, apellido y director suplente.
 */
@Component({
  selector: 'app-editar-usuario',
  imports: [EstructuraPanel, Icono, PantallaCarga, FormularioPerfilUsuario],
  templateUrl: './editar-usuario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarUsuario {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  private readonly idUsuario = Number(this.route.snapshot.paramMap.get('idUsuario'));

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioDetalle | null>(null);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);

  // ── Estado de la cuenta ────────────────────────────────────────────────
  protected readonly confirmandoBaja = signal(false);
  protected readonly dandoDeBaja = signal(false);
  protected readonly errorBaja = signal<string | null>(null);
  protected readonly mensajeBaja = signal<string | null>(null);
  protected readonly confirmandoReactivacion = signal(false);
  protected readonly reactivando = signal(false);
  protected readonly errorReactivacion = signal<string | null>(null);

  /** Nadie se da de baja a sí mismo: se quedaría afuera del sistema sin vuelta atrás. */
  protected readonly esUnoMismo = computed(() => this.sesion()?.idUsuario === this.idUsuario);

  protected readonly nombreCompleto = computed(() => {
    const usuario = this.usuario();
    return usuario === null ? '' : `${usuario.nombre} ${usuario.apellido}`.trim();
  });

  /** Lo que el formulario muestra al abrirse. */
  protected readonly perfilInicial = computed<PerfilInicial | null>(() => {
    const usuario = this.usuario();
    if (usuario === null) {
      return null;
    }
    return {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni,
      email: usuario.email,
      telefono: usuario.telefono ?? '',
      direccion: usuario.direccion ?? '',
      idProvincia: usuario.idProvincia ?? undefined,
      fechaNacimiento: usuario.fechaNac,
      contactoEmergencia: usuario.contactoEmergencia ?? '',
      telefonoEmergencia: usuario.telefonoEmergencia ?? '',
      rol: ORDEN_DE_ROLES.find((rol) => usuario.roles.includes(rol)),
    };
  });

  // Las provincias van por un pedido aparte del usuario y pueden llegar antes
  // o después: el formulario preselecciona la del usuario en cualquiera de los
  // dos órdenes. Si fallan, el resto de la pantalla sigue andando.
  protected readonly provincias = signal<readonly Provincia[]>([]);
  protected readonly cargandoProvincias = signal(true);
  protected readonly falloProvincias = signal(false);

  constructor() {
    this.campana.refrescar();
    this.cargarUsuario();
    this.cargarProvincias();
  }

  private cargarProvincias(): void {
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

  private cargarUsuario(): void {
    if (!Number.isFinite(this.idUsuario) || this.idUsuario <= 0) {
      this.errorCarga.set('No encontramos a esa persona.');
      this.cargando.set(false);
      return;
    }

    this.usuarios.obtener(this.idUsuario).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set(
          'No pudimos traer los datos de esta persona. Intentá de nuevo en un momento.',
        );
        this.cargando.set(false);
      },
    });
  }

  protected guardar(perfil: PerfilUsuario): void {
    if (this.enviando()) {
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.mensajeExito.set(null);

    this.usuarios.actualizar(this.idUsuario, perfil).subscribe({
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

  protected pedirConfirmacionBaja(): void {
    this.errorBaja.set(null);
    this.confirmandoBaja.set(true);
  }

  protected cancelarBaja(): void {
    this.confirmandoBaja.set(false);
  }

  protected confirmarBaja(): void {
    if (this.dandoDeBaja() || this.esUnoMismo()) {
      return;
    }
    this.dandoDeBaja.set(true);
    this.errorBaja.set(null);

    this.usuarios.darDeBaja(this.idUsuario).subscribe({
      next: (mensaje) => {
        this.dandoDeBaja.set(false);
        this.confirmandoBaja.set(false);
        this.mensajeBaja.set(mensaje);
        this.usuario.update((u) => (u === null ? u : { ...u, estadoUsuario: false }));
      },
      error: (fallo: Error) => {
        this.dandoDeBaja.set(false);
        this.errorBaja.set(fallo.message);
      },
    });
  }

  protected pedirConfirmacionReactivacion(): void {
    this.errorReactivacion.set(null);
    this.confirmandoReactivacion.set(true);
  }

  protected cancelarReactivacion(): void {
    this.confirmandoReactivacion.set(false);
  }

  protected confirmarReactivacion(): void {
    if (this.reactivando()) {
      return;
    }
    this.reactivando.set(true);
    this.errorReactivacion.set(null);

    this.usuarios.reactivar(this.idUsuario).subscribe({
      next: () => {
        this.reactivando.set(false);
        this.confirmandoReactivacion.set(false);
        this.usuario.update((u) => (u === null ? u : { ...u, estadoUsuario: true }));
      },
      error: (fallo: Error) => {
        this.reactivando.set(false);
        this.errorReactivacion.set(fallo.message);
      },
    });
  }

  protected volverAlPanel(): void {
    this.router.navigate(['/director/panel']);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
