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

  protected readonly requisitos = computed(() =>
    evaluarPassword(this.password(), this.dni()),
  );

  protected readonly cumplidos = computed(
    () => this.requisitos().filter((requisito) => requisito.cumple).length,
  );
}
