import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { evaluarPassword } from '../../../core/auth/password';

/**
 * La lista de requisitos de la contraseña, marcando cuáles ya se cumplen
 * mientras la persona escribe.
 *
 * Existe como componente compartido porque lo van a usar el alta de usuarios,
 * el cambio de contraseña y la recuperación. Y se muestra siempre, no solo
 * cuando falla: decirle a alguien qué necesita ANTES de que se equivoque es
 * bastante mejor que retarlo después.
 */
@Component({
  selector: 'app-requisitos-password',
  templateUrl: './requisitos-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitosPassword {
  readonly password = input<string>('');

  /** El DNI del mismo formulario, para la regla de "que no lo incluya". */
  readonly dni = input<string>('');

  /**
   * `clave` de las reglas que NO se dibujan. Por defecto ninguna.
   *
   * Sirve para las pantallas que no tienen el DNI a mano (crear contraseña
   * desde el link del mail): ahí la regla "sin-dni" daría "cumple" siempre y
   * mostrarla tildada sería mentirle a la persona. No cambia la política,
   * solo qué se muestra.
   */
  readonly omitir = input<readonly string[]>([]);

  protected readonly requisitos = computed(() =>
    evaluarPassword(this.password(), this.dni()).filter(
      (requisito) => !this.omitir().includes(requisito.clave),
    ),
  );

  protected readonly cumplidos = computed(
    () => this.requisitos().filter((requisito) => requisito.cumple).length,
  );
}
