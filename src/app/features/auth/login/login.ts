import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
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
 */
@Component({
  selector: 'app-login',
  imports: [PanelBienvenida, FormularioLogin],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);

  /** `true` mientras esperamos la respuesta del servidor. */
  protected readonly cargando = signal(false);

  /** Mensaje de error del último intento, o `null` si no hubo. */
  protected readonly error = signal<string | null>(null);

  /**
   * Perfil elegido en la pantalla anterior.
   *
   * TODO: hoy está fijo. Cuando exista la pantalla de selección de perfil,
   * este valor va a llegar por la ruta. Antes hay que definir con el equipo
   * qué hace el backend con el perfil elegido: el endpoint de login solo
   * acepta { dni, password } y decide el rol por su cuenta.
   */
  protected readonly perfil = signal<string | null>('Director');

  protected iniciarSesion(credenciales: CredencialesLogin): void {
    this.cargando.set(true);
    this.error.set(null);

    this.auth.iniciarSesion(credenciales).subscribe({
      next: () => {
        this.cargando.set(false);
        // TODO: redirigir al dashboard que corresponda al rol.
        // Falta que backend nos pase la equivalencia entre el `role` del
        // token ("1", "2", ...) y los roles reales del sistema.
      },
      error: (fallo: Error) => {
        this.cargando.set(false);
        this.error.set(fallo.message);
      },
    });
  }

  protected volverASeleccionDePerfil(): void {
    // TODO: navegar a la pantalla de selección de perfil cuando exista.
  }
}
