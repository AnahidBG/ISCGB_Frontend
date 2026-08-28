import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { CredencialesLogin } from '../../../core/auth/modelos/credenciales-login';
import { FormularioLogin } from './partes/formulario-login/formulario-login';
import { PanelBienvenida } from './partes/panel-bienvenida/panel-bienvenida';

/**
 * Pantalla de inicio de sesión.
 *
 * Este es el componente CONTENEDOR: es el único de la pantalla que conoce
 * `AuthService`. Su trabajo es coordinar, no dibujar.
 *
 *   Login  (contenedor)  ← sabe de servicios, maneja el estado
 *     ├── PanelBienvenida   (presentacional)
 *     └── FormularioLogin   (presentacional)
 *
 * La ventaja de partirlo así: los dos hijos se pueden mirar, probar y
 * rediseñar sin tocar nada de autenticación. Y toda la lógica de la pantalla
 * vive en un archivo solo, en vez de estar desparramada.
 *
 * A dónde va cada persona después de entrar lo decide `destinoSegunRoles`,
 * que vive en `core/auth/` porque la pantalla de 404 necesita responder esa
 * misma pregunta.
 */
@Component({
  selector: 'app-login',
  imports: [PanelBienvenida, FormularioLogin],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** `true` mientras esperamos la respuesta del servidor. */
  protected readonly cargando = signal(false);

  /** Mensaje de error del último intento, o `null` si no hubo. */
  protected readonly error = signal<string | null>(null);

  protected iniciarSesion(credenciales: CredencialesLogin): void {
    this.cargando.set(true);
    this.error.set(null);

    this.auth.iniciarSesion(credenciales).subscribe({
      next: (sesion) => {
        this.cargando.set(false);
        this.router.navigate([destinoSegunRoles(sesion)]);
      },
      error: (fallo: Error) => {
        this.cargando.set(false);
        this.error.set(fallo.message);
      },
    });
  }
}
