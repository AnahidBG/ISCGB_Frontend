import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { formatearDni } from '../../core/auth/dni';
import { ROLES } from '../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../core/auth/modelos/sesion';
import { Boton } from '../../shared/ui/boton/boton';

/**
 * Pantalla de destino después de iniciar sesión.
 *
 * ⚠️ PROVISORIA. Existe para cerrar el circuito del login: entrás, llegás a
 * algún lado y podés salir. Muestra los datos de la sesión para comprobar de
 * un vistazo que la autenticación funcionó.
 *
 * Se reemplaza por el dashboard de cada rol cuando esos dashboards existan.
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
  private readonly route = inject(ActivatedRoute);

  protected readonly sesion = this.auth.sesion;

  /**
   * `true` cuando `roleGuard` mandó para acá porque la sesión intentó
   * entrar a una pantalla que no le corresponde por su rol — ver el
   * criterio de Sprint 2 "Gestión de usuarios y roles": el sistema tiene
   * que avisarlo, no redirigir en silencio.
   */
  protected readonly accesoDenegado = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('accesoDenegado') === '1')),
    { initialValue: false },
  );

  /**
   * ¿Mostrarle el acceso a la entrega del programa?
   *
   * Es la misma condición que protege la ruta en `app.routes.ts`. Esconder el
   * botón evita que alguien llegue a una pantalla que le van a negar; el
   * `roleGuard` es el que de verdad la cierra. Las dos cosas, no una sola:
   * sin el botón oculto la experiencia es mala, sin el guard la puerta queda
   * abierta a quien escriba la URL a mano.
   */
  protected readonly puedeEntregarPrograma = computed(() =>
    tieneAlgunRol(this.sesion(), [ROLES.docente]),
  );

  /** Los roles como texto para mostrar: "Docente" o "Director y Docente". */
  protected readonly rolesParaMostrar = computed(() => {
    const roles = this.sesion()?.roles ?? [];
    return roles.length === 0 ? 'Sin rol asignado' : roles.join(' · ');
  });

  /** El DNI con puntos, como lo lee una persona. */
  protected dniConPuntos(dni: string): string {
    return formatearDni(dni);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
