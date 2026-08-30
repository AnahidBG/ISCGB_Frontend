import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { esDniValido, normalizarDni } from '../../../core/auth/dni';
import {
  LARGO_MINIMO_PASSWORD,
  validadorPassword,
} from '../../../core/auth/password';
import { ROLES, Rol } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { OPCIONES_DE_ROL } from '../../../core/usuarios/modelos/nuevo-usuario';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { ENLACES_COMUNES } from '../../../shared/ui/estructura-panel/enlaces-comunes';
import {
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { RequisitosPassword } from '../../../shared/ui/requisitos-password/requisitos-password';

/**
 * Alta de un usuario del instituto — el reemplazo de hacerlo por Swagger.
 *
 * Es del Director y de nadie más: ISCGB-PROJECT.md le da a ese rol el
 * "alta/baja/modificación de usuarios y roles" (Sprint 2). La ruta está
 * protegida con `roleGuard(ROLES.director)`; este componente además esconde
 * lo que no corresponde, pero el guard es el que cierra la puerta.
 *
 * ⚠️ IMPORTANTE — el backend todavía no tiene el endpoint.
 *
 * `UsuariosController` hoy solo tiene dos GET. Lo único que crea usuarios es
 * `POST /api/Auth/crear-usuario-prueba`, que acepta nada más que
 * `{ dni, password }` y escribe a mano `email = "prueba@test.com"` y
 * `IdRol = 1` — el propio código dice "esto es de prueba. No quedaría de
 * esta forma". Enganchar este formulario ahí sería peor que no tenerlo:
 * cargarías el nombre, el apellido y los roles de una persona real y el
 * backend los tiraría a la basura, dando de alta a todo el mundo como
 * Alumno con un correo inventado.
 *
 * Por eso el envío apunta a `POST /api/Usuarios`, que es donde corresponde, y
 * cuando responde 404 la pantalla lo dice con todas las letras en vez de
 * fingir un error de red. El contrato que falta implementar está escrito en
 * `docs/contrato-alta-usuario.md`: cuando exista, esto funciona sin tocar
 * una línea de Angular.
 */
@Component({
  selector: 'app-alta-usuario',
  imports: [EstructuraPanel, ReactiveFormsModule, Icono, RequisitosPassword],
  templateUrl: './alta-usuario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AltaUsuario {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly sesion = this.auth.sesion;
  protected readonly opcionesDeRol = OPCIONES_DE_ROL;
  protected readonly largoMinimoPassword = LARGO_MINIMO_PASSWORD;

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seIntentoEnviar = signal(false);
  protected readonly passwordVisible = signal(false);

  /** El nombre de quien se acaba de dar de alta, para la confirmación. */
  protected readonly recienCreado = signal<string | null>(null);

  /**
   * Los roles tildados.
   *
   * Van por fuera del `FormGroup` a propósito: son casillas múltiples con
   * descripción, y armarlas como `FormArray` obligaría a mantener el orden
   * del arreglo sincronizado con el de las opciones — más código para el
   * mismo resultado. Un `Set` en un signal responde exactamente la pregunta
   * que importa: "¿este rol está elegido?".
   */
  protected readonly rolesElegidos = signal<ReadonlySet<Rol>>(new Set());

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    dni: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(LARGO_MINIMO_PASSWORD)]],
    telefono: [''],
    fechaNacimiento: [''],
    direccion: [''],
    lugarNacimiento: [''],
    contactoEmergencia: [''],
    telefonoEmergencia: [''],
    activo: [true],
  }, { validators: validadorPassword() });

  /**
   * El valor de estos dos campos como signal, para que la lista de requisitos
   * se actualice mientras la persona escribe. `valueChanges` no arranca con
   * el valor actual, por eso el `initialValue`.
   */
  protected readonly passwordEscrita = toSignal(
    this.formulario.controls.password.valueChanges,
    { initialValue: '' },
  );

  protected readonly dniEscrito = toSignal(this.formulario.controls.dni.valueChanges, {
    initialValue: '',
  });

  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const enlaces: EnlacePanel[] = [
      { etiqueta: 'Dashboard', url: '/director/panel', icono: 'panel' },
      { etiqueta: 'Nuevo usuario', url: '/director/usuarios/nuevo', icono: 'usuarios' },
    ];

    if (tieneAlgunRol(this.sesion(), [ROLES.docente])) {
      enlaces.push({
        etiqueta: 'Entregar programa de materia',
        url: '/docente/entrega-programa',
        icono: 'legajo',
      });
    }

    enlaces.push(...ENLACES_COMUNES);
    return enlaces;
  });

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

  protected enviar(): void {
    this.seIntentoEnviar.set(true);
    this.error.set(null);

    if (this.formulario.invalid || this.rolesElegidos().size === 0 || this.enviando()) {
      return;
    }

    const valores = this.formulario.getRawValue();
    const nombreCompleto = `${valores.nombre.trim()} ${valores.apellido.trim()}`.trim();

    this.enviando.set(true);

    this.usuarios
      .crear({
        // El backend espera el DNI sin puntos, igual que en el login.
        dni: normalizarDni(valores.dni),
        nombre: valores.nombre.trim(),
        apellido: valores.apellido.trim(),
        email: valores.email.trim(),
        password: valores.password,
        roles: [...this.rolesElegidos()],
        activo: valores.activo,
        telefono: aTextoOpcional(valores.telefono),
        fechaNacimiento: aFechaOpcional(valores.fechaNacimiento),
        direccion: aTextoOpcional(valores.direccion),
        lugarNacimiento: aTextoOpcional(valores.lugarNacimiento),
        contactoEmergencia: aTextoOpcional(valores.contactoEmergencia),
        telefonoEmergencia: aTextoOpcional(valores.telefonoEmergencia),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.recienCreado.set(nombreCompleto);
        },
        error: (fallo: Error) => {
          this.enviando.set(false);
          this.error.set(fallo.message);
        },
      });
  }

  /** Deja el formulario limpio para cargar a la persona siguiente. */
  protected cargarOtro(): void {
    this.formulario.reset({ activo: true });
    this.rolesElegidos.set(new Set());
    this.seIntentoEnviar.set(false);
    this.passwordVisible.set(false);
    this.recienCreado.set(null);
    this.error.set(null);
  }

  protected volverAlPanel(): void {
    this.router.navigate(['/director/panel']);
  }

  protected alternarPassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

  // ── Errores por campo ────────────────────────────────────────────────────
  // Todos se callan hasta el primer intento de envío: retar a alguien
  // mientras todavía está escribiendo es mala educación. Mismo criterio que
  // `FormularioLogin`.

  protected get errorNombre(): string | null {
    return this.requerido('nombre', 'Ingresá el nombre.');
  }

  protected get errorApellido(): string | null {
    return this.requerido('apellido', 'Ingresá el apellido.');
  }

  protected get errorDni(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    const valor = this.formulario.controls.dni.value.trim();
    if (valor === '') {
      return 'Ingresá el DNI.';
    }
    if (!esDniValido(valor)) {
      return 'El DNI tiene que tener 7 u 8 números.';
    }
    return null;
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

  protected get errorPassword(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    const control = this.formulario.controls.password;
    if (control.value === '') {
      return 'Ingresá una contraseña inicial.';
    }
    if (control.hasError('minlength') || control.hasError('requisitos')) {
      return 'La contraseña no cumple con los requisitos de abajo.';
    }
    return null;
  }

  protected get errorRoles(): string | null {
    if (!this.seIntentoEnviar() || this.rolesElegidos().size > 0) {
      return null;
    }
    return 'Elegí al menos un rol: sin rol la persona entra al sistema pero no puede hacer nada.';
  }

  private requerido(
    campo: 'nombre' | 'apellido',
    mensaje: string,
  ): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    return this.formulario.controls[campo].value.trim() === '' ? mensaje : null;
  }
}

/** Un campo opcional vacío viaja como `null`, no como `""`. */
function aTextoOpcional(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

/** El `<input type="date">` da "2026-08-27"; sin hora para que no corra un día por zona horaria. */
function aFechaOpcional(valor: string): Date | null {
  return valor === '' ? null : new Date(`${valor}T00:00:00`);
}
