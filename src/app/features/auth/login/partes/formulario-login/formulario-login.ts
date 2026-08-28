import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { esDniValido, normalizarDni } from '../../../../../core/auth/dni';
import { CredencialesLogin } from '../../../../../core/auth/modelos/credenciales-login';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';

/**
 * El formulario de ingreso: DNI, contraseña y el botón.
 *
 * Es un componente PRESENTACIONAL. No conoce `AuthService`, no llama a la
 * API y no navega a ningún lado. Solo sabe dos cosas:
 *
 *   · Recibe cómo mostrarse (`cargando`, `errorGeneral`, `perfil`).
 *   · Avisa hacia afuera cuando el usuario aprieta Iniciar Sesión (`enviar`).
 *
 * Quien decide qué hacer con eso es `Login`, el componente contenedor.
 *
 * ¿Por qué separarlo así? Porque un componente que no depende de servicios
 * se puede probar pasándole valores y mirando qué emite, sin levantar un
 * backend ni simular la red. Y se puede reusar: el día que haya que loguear
 * desde otro lado, este formulario ya está.
 */
@Component({
  selector: 'app-formulario-login',
  imports: [ReactiveFormsModule, CampoFormulario, Boton, RouterLink],
  templateUrl: './formulario-login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioLogin {
  private readonly fb = inject(FormBuilder);

  /** `true` mientras se está validando contra el servidor. */
  readonly cargando = input<boolean>(false);

  /** Error de autenticación a mostrar arriba del formulario. */
  readonly errorGeneral = input<string | null>(null);

  /** Se emite con las credenciales listas para enviar. */
  readonly enviar = output<CredencialesLogin>();

  /** ¿La contraseña se está mostrando en texto plano? */
  protected readonly passwordVisible = signal(false);

  /** Se pone en `true` al primer intento de envío, para no retar antes de tiempo. */
  protected readonly seIntentoEnviar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    dni: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  protected alternarPassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected alEnviar(): void {
    this.seIntentoEnviar.set(true);

    if (this.formulario.invalid || this.cargando()) {
      return;
    }

    const { dni, password } = this.formulario.getRawValue();

    // El usuario escribe "43.880.335"; el backend espera "43880335".
    this.enviar.emit({ dni: normalizarDni(dni), password });
  }

  /**
   * Mensaje de error del campo DNI, o `null` si está bien.
   *
   * Solo se muestra después del primer intento de envío: retar a alguien
   * mientras todavía está escribiendo es mala educación.
   */
  protected get errorDni(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }

    const valor = this.formulario.controls.dni.value.trim();
    if (valor === '') {
      return 'Ingresá tu DNI.';
    }
    if (!esDniValido(valor)) {
      return 'El DNI tiene que tener 7 u 8 números.';
    }
    return null;
  }

  protected get errorPassword(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    return this.formulario.controls.password.value === '' ? 'Ingresá tu contraseña.' : null;
  }
}
