import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { Rol } from '../../../core/auth/modelos/rol';
import { OPCIONES_DE_ROL } from '../../../core/usuarios/modelos/nuevo-usuario';
import { UsuarioDetalle } from '../../../core/usuarios/modelos/usuario-detalle';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/**
 * Editar Usuario — Sprint 2, "Gestión de usuarios y roles" (Director).
 *
 * Es el complemento de `AltaUsuario`: mismos campos (menos DNI, que no se
 * edita, y sin contraseña, que no se toca acá), pero precargados desde
 * `GET /api/Usuarios/{id}` (real) y guardados con `PUT /api/Usuarios/{id}`
 * (todavía no existe — ver el comentario de `DatosEditarUsuario`).
 *
 * "Baja" ES este mismo formulario: destildar "Puede iniciar sesión" y
 * guardar dark — el criterio pide exactamente eso, un cambio de estado a
 * inactivo, nunca borrar a la persona ni su documentación.
 *
 * ⚠️ A propósito NO tiene campos de CUIL, Sexo/Género, N° Legajo, Carrera/
 * Especialidad ni Director Suplente — el criterio de Sprint 2 los pide,
 * pero ni existen como columna en la base ni hay contrato documentado de
 * cómo el backend los va a esperar. Agregarlos acá sería mandarle al
 * servidor una forma inventada que después puede no coincidir con la real.
 * Quedan pendientes de una conversación con backend antes de construirse.
 */
@Component({
  selector: 'app-editar-usuario',
  imports: [EstructuraPanel, ReactiveFormsModule, Icono, PantallaCarga],
  templateUrl: './editar-usuario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarUsuario {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly opcionesDeRol = OPCIONES_DE_ROL;
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  private readonly idUsuario = Number(this.route.snapshot.paramMap.get('idUsuario'));

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioDetalle | null>(null);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seIntentoEnviar = signal(false);
  protected readonly guardadoConExito = signal(false);

  protected readonly rolesElegidos = signal<ReadonlySet<Rol>>(new Set());

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefono: [''],
    fechaNacimiento: [''],
    direccion: [''],
    lugarNacimiento: [''],
    contactoEmergencia: [''],
    telefonoEmergencia: [''],
    activo: [true],
  });

  constructor() {
    this.cargarUsuario();
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
        this.rolesElegidos.set(new Set(usuario.roles));
        this.formulario.patchValue({
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          email: usuario.email,
          telefono: usuario.telefono ?? '',
          fechaNacimiento: usuario.fechaNac ? aFechaInput(usuario.fechaNac) : '',
          direccion: usuario.direccion ?? '',
          lugarNacimiento: usuario.lugarNacimiento ?? '',
          contactoEmergencia: usuario.contactoEmergencia ?? '',
          telefonoEmergencia: usuario.telefonoEmergencia ?? '',
          activo: usuario.estadoUsuario,
        });
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No pudimos traer los datos de esta persona. Intentá de nuevo en un momento.');
        this.cargando.set(false);
      },
    });
  }

  protected estaElegido(rol: Rol): boolean {
    return this.rolesElegidos().has(rol);
  }

  protected alternarRol(rol: Rol): void {
    this.rolesElegidos.update((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(rol)) {
        nuevos.delete(rol);
      } else {
        nuevos.add(rol);
      }
      return nuevos;
    });
  }

  protected guardar(): void {
    this.seIntentoEnviar.set(true);
    this.error.set(null);

    if (this.formulario.invalid || this.rolesElegidos().size === 0 || this.enviando()) {
      return;
    }

    const valores = this.formulario.getRawValue();
    this.enviando.set(true);

    this.usuarios
      .actualizar(this.idUsuario, {
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim(),
        email: valores.email.trim(),
        roles: [...this.rolesElegidos()],
        activo: valores.activo,
        telefono: aTextoOpcional(valores.telefono),
        fechaNacimiento: valores.fechaNacimiento === '' ? null : new Date(`${valores.fechaNacimiento}T00:00:00`),
        direccion: aTextoOpcional(valores.direccion),
        lugarNacimiento: aTextoOpcional(valores.lugarNacimiento),
        contactoEmergencia: aTextoOpcional(valores.contactoEmergencia),
        telefonoEmergencia: aTextoOpcional(valores.telefonoEmergencia),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.guardadoConExito.set(true);
        },
        error: (fallo: Error) => {
          this.enviando.set(false);
          this.error.set(fallo.message);
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

  protected get errorNombre(): string | null {
    return this.requerido('nombre', 'Ingresá el nombre.');
  }

  protected get errorApellido(): string | null {
    return this.requerido('apellido', 'Ingresá el apellido.');
  }

  protected get errorEmail(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    const control = this.formulario.controls.email;
    if (control.value.trim() === '') {
      return 'Ingresá el correo. Es a donde van los avisos del sistema.';
    }
    return control.hasError('email') ? 'Ese correo no parece válido.' : null;
  }

  protected get errorRoles(): string | null {
    if (!this.seIntentoEnviar() || this.rolesElegidos().size > 0) {
      return null;
    }
    return 'Elegí al menos un rol: sin rol la persona entra al sistema pero no puede hacer nada.';
  }

  private requerido(campo: 'nombre' | 'apellido', mensaje: string): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    return this.formulario.controls[campo].value.trim() === '' ? mensaje : null;
  }
}

function aTextoOpcional(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

/** `Date` → "2026-08-27" para precargar un `<input type="date">`. */
function aFechaInput(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
