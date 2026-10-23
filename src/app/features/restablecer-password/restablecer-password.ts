import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, MENSAJE_ENLACE_RECUPERACION_INVALIDO } from '../../core/auth/auth.service';
import { passwordCumpleTodo } from '../../core/auth/password';
import { RequisitosPassword } from '../../shared/ui/requisitos-password/requisitos-password';

/** Cuánto se muestra el aviso de éxito antes de llevar a la persona al login. */
export const ESPERA_REDIRECCION_MS = 3000;

/**
 * Reglas de la política que esta pantalla NO muestra.
 *
 * Igual que en `crear-password`: acá solo hay un token, no el DNI, y la regla
 * `sin-dni` daría "cumple" siempre. Mostrarla tildada sería mentirle a la
 * persona. La regla la sigue controlando "Configuración", que sí tiene el DNI.
 */
const REQUISITOS_OMITIDOS: readonly string[] = ['sin-dni'];

/** La contraseña cumple la política (sin `sin-dni`, que acá no se puede evaluar). */
function requisitosCumplidos(control: AbstractControl<string>): ValidationErrors | null {
  const valor = control.value ?? '';
  return valor === '' || passwordCumpleTodo(valor) ? null : { requisitos: true };
}

/** Las dos contraseñas son iguales. Vacía la repetida, lo resuelve `required`. */
function contrasenasCoinciden(grupo: AbstractControl): ValidationErrors | null {
  const password = grupo.get('password')?.value;
  const repetida = grupo.get('confirmPassword')?.value;
  return !repetida || password === repetida ? null : { noCoinciden: true };
}

/**
 * Pantalla "Nueva contraseña" (SCRUM-223): el paso 2 del recupero.
 *
 * Se llega desde el enlace del mail que pide "¿Olvidaste tu contraseña?"
 * (`/restablecer-password?token=...`), sin sesión. Guarda con
 * `POST /api/Auth/establecer-password`. El token es de un solo uso y vence en
 * 1 hora; si no sirve, la persona puede pedir otro sola.
 *
 * Diseño de Gonza (rama `feature/recuperacion-contrasenia`). Es el
 * contenedor: conoce `AuthService` y decide cuál de los tres cuadros se ve
 * (formulario, éxito o enlace inválido).
 *
 * ⚠️ La política de contraseñas es UX, no seguridad: el backend hoy solo exige
 * que no venga vacía. Ver `core/auth/password.ts`.
 */
@Component({
  selector: 'app-restablecer-password',
  imports: [ReactiveFormsModule, RouterLink, RequisitosPassword],
  templateUrl: './restablecer-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerPassword {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly requisitosOmitidos = REQUISITOS_OMITIDOS;
  protected readonly mensajeEnlaceInvalido = MENSAJE_ENLACE_RECUPERACION_INVALIDO;

  /** El token del query string, sin espacios. Vacío si falta. */
  private readonly token = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('token') ?? '').trim())),
    { initialValue: '' },
  );

  protected readonly form = this.fb.group(
    {
      password: ['', [Validators.required, requisitosCumplidos]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: contrasenasCoinciden },
  );

  /** La contraseña como signal, para que la lista de requisitos se tilde en vivo. */
  protected readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });

  protected readonly cargando = signal(false);
  protected readonly exito = signal(false);

  /** El backend rechazó el token (400): inexistente, ya usado o vencido. */
  private readonly enlaceRechazado = signal(false);

  /** Error de conexión o genérico del último envío. El formulario sigue usable. */
  protected readonly errorEnvio = signal<string | null>(null);

  /** Sin token en la URL o token rechazado: el formulario no tiene sentido. */
  protected readonly enlaceInvalido = computed(() => this.token() === '' || this.enlaceRechazado());

  private redireccion: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destruccion.onDestroy(() => {
      if (this.redireccion !== null) {
        clearTimeout(this.redireccion);
      }
    });
  }

  /** Mostrar el error de un campo recién cuando la persona lo tocó o intentó enviar. */
  protected mostrarError(campo: 'password' | 'confirmPassword'): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  /** La repetida no coincide. Va aparte porque el error es del grupo, no del campo. */
  protected noCoinciden(): boolean {
    return this.form.controls.confirmPassword.touched && this.form.hasError('noCoinciden');
  }

  protected enviar(): void {
    // El token es de un solo uso: un segundo envío mientras vuela el primero
    // no puede llegar al servicio.
    if (this.cargando() || this.enlaceInvalido()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.errorEnvio.set(null);

    this.auth
      .restablecerPassword(this.token(), this.form.controls.password.value)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.exito.set(true);
          this.redireccion = setTimeout(
            () => this.router.navigate(['/login']),
            ESPERA_REDIRECCION_MS,
          );
        },
        error: (fallo: Error) => {
          this.cargando.set(false);

          if (fallo.message === MENSAJE_ENLACE_RECUPERACION_INVALIDO) {
            this.enlaceRechazado.set(true);
            return;
          }
          // Conexión o falla genérica: se conserva lo escrito para reintentar.
          this.errorEnvio.set(fallo.message);
        },
      });
  }
}
