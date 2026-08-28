import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { destinoSegunRoles } from '../../core/auth/destino-por-rol';

/**
 * Pantalla de 404.
 *
 * Antes esta ruta redirigía al login sin decir nada. Eso es peor de lo que
 * parece: alguien que se equivocó al tipear una dirección, o que abrió un
 * enlace viejo, aparecía en el login sin entender por qué — y si ya tenía la
 * sesión abierta, encima parecía que lo habían echado.
 *
 * La animación no es un adorno: el isotipo del instituto son dos eslabones
 * entrelazados, así que un enlace roto se cuenta solo. Los dos eslabones se
 * separan, se quedan un momento sueltos y vuelven a engancharse — en loop.
 * Esa vuelta a engancharse es a propósito: el mensaje es "esto se arregla",
 * y los botones de abajo son cómo. Ver `no-encontrado.scss`.
 *
 * El destino del botón principal depende de quién esté mirando: con sesión
 * abierta, su propio panel; sin sesión, el login. Mandar a alguien logueado
 * al login sería hacerlo entrar de nuevo por nada.
 */
@Component({
  selector: 'app-no-encontrado',
  templateUrl: './no-encontrado.html',
  styleUrl: './no-encontrado.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoEncontrado {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly haySesion = computed(() => this.auth.sesion() !== null);

  protected readonly etiquetaPrincipal = computed(() =>
    this.haySesion() ? 'Ir a mi panel' : 'Ir al inicio de sesión',
  );

  protected irAlDestino(): void {
    this.router.navigate([destinoSegunRoles(this.auth.sesion())]);
  }

  /**
   * Vuelve a la página anterior del navegador.
   *
   * Si alguien llegó acá desde adentro del sistema, esto lo devuelve a donde
   * estaba sin hacerle perder el hilo. Solo se ofrece cuando hay historia a
   * la que volver: en una pestaña recién abierta el botón no aparece, porque
   * no haría nada.
   */
  protected volverAtras(): void {
    history.back();
  }

  protected readonly puedeVolverAtras = history.length > 1;
}
