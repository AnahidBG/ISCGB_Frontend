import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { formatearDni } from '../../core/auth/dni';
import { Boton } from '../../shared/ui/boton/boton';

/**
 * Pantalla de destino después de iniciar sesión.
 *
 * ⚠️ PROVISORIA. Existe para cerrar el circuito del login: entrás, llegás a
 * algún lado y podés salir. Muestra los datos de la sesión para comprobar de
 * un vistazo que la autenticación funcionó.
 *
 * Cuando backend nos pase la equivalencia entre el `role` del token
 * ("1", "2", …) y los roles reales, esta pantalla se reemplaza por el
 * dashboard que corresponda a cada rol.
 */
@Component({
  selector: 'app-inicio',
  imports: [Boton],
  templateUrl: './inicio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inicio {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El DNI con puntos, como lo lee una persona. */
  protected dniConPuntos(dni: string): string {
    return formatearDni(dni);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
