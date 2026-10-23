import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { esDniValido, normalizarDni } from '../../core/auth/dni';
import { Boton } from '../../shared/ui/boton/boton';
import { CampoFormulario } from '../../shared/ui/campo-formulario/campo-formulario';

/** Lo que se muestra debajo del DNI cuando no tiene la forma de un DNI. */
export const MENSAJE_DNI_INVALIDO = 'Ingresá un DNI de 7 u 8 números.';

/**
 * Pantalla de "¿Olvidaste tu contraseña?" (SCRUM-221).
 *
 * Es el paso 1 del recupero: la persona pone su DNI y el backend le manda un
 * mail con el enlace a `/restablecer-password?token=...`, que vence en 1 hora
 * (`POST /api/Auth/recuperar-contrasena`). El paso 2 es
 * `features/restablecer-password/`.
 *
 * Pública, sin sesión. Es el contenedor: conoce `AuthService` y decide si se
 * ve el formulario o el aviso de "revisá tu correo".
 *
 * El aviso es el mismo exista o no el DNI. El backend contesta igual en los
 * dos casos para que nadie pueda averiguar qué DNIs están registrados, y la
 * pantalla no puede deshacer eso.
 */
@Component({
  selector: 'app-recuperar-contrasena',
  imports: [Boton, CampoFormulario],
  templateUrl: './recuperar-contrasena.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarContrasena {
  private readonly auth = inject(AuthService);
  private readonly destruccion = inject(DestroyRef);

  protected readonly dni = signal('');
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);

  /** Falla de conexión o del servidor del último envío. El formulario sigue usable. */
  protected readonly errorEnvio = signal<string | null>(null);

  /** Se pone en `true` al primer intento de envío, para no retar antes de tiempo. */
  private readonly seIntentoEnviar = signal(false);

  protected readonly errorDni = computed(() =>
    this.seIntentoEnviar() && !esDniValido(this.dni()) ? MENSAJE_DNI_INVALIDO : null,
  );

  protected actualizarDni(valor: string): void {
    this.dni.set(valor);
  }

  protected enviar(): void {
    if (this.enviando()) {
      return;
    }

    this.seIntentoEnviar.set(true);
    if (this.errorDni() !== null) {
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.auth
      .solicitarRecuperacion(normalizarDni(this.dni()))
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.enviado.set(true);
        },
        error: (fallo: Error) => {
          // Se conserva el DNI escrito para reintentar.
          this.enviando.set(false);
          this.errorEnvio.set(fallo.message);
        },
      });
  }

  /** "¿No te llegó?": vuelve al formulario con el DNI que ya estaba escrito. */
  protected volverAEnviar(): void {
    this.enviado.set(false);
  }
}
