import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, MENSAJE_ENLACE_INVALIDO } from '../../core/auth/auth.service';
import { passwordCumpleTodo } from '../../core/auth/password';
import { Boton } from '../../shared/ui/boton/boton';
import { CampoFormulario } from '../../shared/ui/campo-formulario/campo-formulario';
import { RequisitosPassword } from '../../shared/ui/requisitos-password/requisitos-password';

/**
 * Reglas de la política que esta pantalla NO muestra.
 *
 * `sin-dni` necesita el DNI para evaluarse y acá solo hay un token: con el DNI
 * vacío la regla da "cumple" siempre, y verla tildada sería mentirle a la
 * persona. La política en sí no cambia (`core/auth/password.ts`); solo se
 * deja de dibujar lo que acá no se puede comprobar.
 */
const REQUISITOS_OMITIDOS: readonly string[] = ['sin-dni'];

/**
 * Pantalla pública donde una persona recién dada de alta define su contraseña.
 *
 * Se llega desde el link del mail de alta (`/crear-password?token=...`), sin
 * sesión. El backend deja la cuenta con la contraseña PENDIENTE: hasta que
 * pasa por acá, el login le responde 401.
 *
 * Es el contenedor de la pantalla: conoce `AuthService` y decide cuál de los
 * tres cuadros se ve (formulario, éxito o enlace inválido).
 *
 * ⚠️ La política de contraseñas es UX, no seguridad: el backend solo exige que
 * no venga vacía. Ver el aviso en `core/auth/password.ts`.
 *
 * El token es de un solo uso y dura 20 días, y NO existe endpoint para pedir
 * uno nuevo: ante un enlace que no sirve, lo único que se le puede decir a la
 * persona es que se comunique con la Dirección.
 */
@Component({
  selector: 'app-crear-password',
  imports: [Boton, CampoFormulario, RequisitosPassword],
  templateUrl: './crear-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearPassword {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly requisitosOmitidos = REQUISITOS_OMITIDOS;
  protected readonly mensajeEnlaceInvalido = MENSAJE_ENLACE_INVALIDO;

  /** El token del query string, sin espacios. Vacío si falta. */
  private readonly token = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('token') ?? '').trim())),
    { initialValue: '' },
  );

  protected readonly password = signal('');
  protected readonly repetida = signal('');
  protected readonly enviando = signal(false);
  protected readonly exito = signal(false);

  /** El backend rechazó el token (400): inexistente, ya usado o vencido. */
  private readonly enlaceRechazado = signal(false);

  /** Error de conexión o genérico del último envío. El formulario sigue usable. */
  protected readonly errorEnvio = signal<string | null>(null);

  /** Se pone en `true` al primer intento de envío, para no retar antes de tiempo. */
  protected readonly seIntentoEnviar = signal(false);

  /**
   * Sin token en la URL o token rechazado: en los dos casos el formulario no
   * tiene sentido, y no se llama al servicio si ni siquiera hay token.
   */
  protected readonly enlaceInvalido = computed(
    () => this.token() === '' || this.enlaceRechazado(),
  );

  protected readonly errorPassword = computed(() =>
    this.seIntentoEnviar() && !passwordCumpleTodo(this.password())
      ? 'La contraseña todavía no cumple todos los requisitos.'
      : null,
  );

  protected readonly errorRepetida = computed(() =>
    this.seIntentoEnviar() && this.password() !== this.repetida()
      ? 'Las contraseñas no coinciden.'
      : null,
  );

  protected actualizarPassword(valor: string): void {
    this.password.set(valor);
  }

  protected actualizarRepetida(valor: string): void {
    this.repetida.set(valor);
  }

  protected enviar(): void {
    // Antes que nada: un segundo envío mientras el primero vuela no puede
    // llegar al servicio, el token es de un solo uso.
    if (this.enviando() || this.enlaceInvalido()) {
      return;
    }

    this.seIntentoEnviar.set(true);

    if (this.errorPassword() !== null || this.errorRepetida() !== null) {
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.auth.establecerPassword(this.token(), this.password()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.exito.set(true);
      },
      error: (fallo: Error) => {
        this.enviando.set(false);

        if (fallo.message === MENSAJE_ENLACE_INVALIDO) {
          this.enlaceRechazado.set(true);
          return;
        }
        // Conexión o falla genérica: se conserva lo escrito para reintentar.
        this.errorEnvio.set(fallo.message);
      },
    });
  }
}
