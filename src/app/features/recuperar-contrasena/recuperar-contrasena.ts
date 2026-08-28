import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Boton } from '../../shared/ui/boton/boton';
import { CampoFormulario } from '../../shared/ui/campo-formulario/campo-formulario';

/** Cuánto tarda la simulación, para que el botón muestre su estado "cargando". */
const DEMORA_SIMULADA_MS = 800;

/**
 * Pantalla de "¿Olvidaste tu contraseña?".
 *
 * ⚠️ PROVISORIA, con datos de mentira. `docs/alcance-login.md` documentó
 * que este flujo quedó afuera del v1: la base ya tiene
 * `Usuarios.token_recuperacion` y `expiracion_token`, pero falta el
 * endpoint (Sprint 3 del roadmap). Esta pantalla existe para que el enlace
 * del login lleve a algo real en vez de a un botón deshabilitado — no
 * envía ningún correo de verdad, solo simula el resultado con un
 * `setTimeout`.
 *
 * Se reemplaza por el flujo real cuando exista el endpoint de recuperación
 * (`POST /api/Auth/recuperar-contrasena` o el nombre que le dé el backend).
 * Cuando eso pase, esta pantalla pasa a tener un `AuthService.abstract` con
 * mock + http, igual que el login.
 */
@Component({
  selector: 'app-recuperar-contrasena',
  imports: [Boton, CampoFormulario],
  templateUrl: './recuperar-contrasena.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecuperarContrasena {
  protected readonly dni = signal('');
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);

  protected actualizarDni(valor: string): void {
    this.dni.set(valor);
  }

  protected enviar(): void {
    if (this.dni().trim() === '' || this.enviando()) {
      return;
    }

    this.enviando.set(true);

    // Nada de esto pega contra un servidor: es una demora simulada para que
    // el botón muestre su estado "cargando" y la pantalla se sienta real.
    setTimeout(() => {
      this.enviando.set(false);
      this.enviado.set(true);
    }, DEMORA_SIMULADA_MS);
  }
}
