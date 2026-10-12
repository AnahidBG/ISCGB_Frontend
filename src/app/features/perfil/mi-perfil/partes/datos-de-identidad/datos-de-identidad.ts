import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatearDni } from '../../../../../core/auth/dni';

/** Lo que se muestra cuando el servidor no tiene el dato cargado. */
const SIN_CARGAR = 'No cargado';

/**
 * Los datos de la persona que "Mi perfil" muestra pero no deja editar: nombre y
 * apellido, DNI y roles. Los actualiza Dirección.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce ningún
 * servicio. Recibe los datos ya listos y los dibuja.
 */
@Component({
  selector: 'app-datos-de-identidad',
  templateUrl: './datos-de-identidad.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosDeIdentidad {
  readonly nombreCompleto = input.required<string>();

  /** Con o sin puntos: se muestra con puntos. */
  readonly dni = input.required<string>();

  readonly roles = input.required<readonly string[]>();

  protected readonly nombreAMostrar = computed(() => this.nombreCompleto().trim() || SIN_CARGAR);
  protected readonly dniAMostrar = computed(() => formatearDni(this.dni()) || SIN_CARGAR);

  /** Una persona sin ningún rol puede iniciar sesión: se dice que no tiene, no se deja en blanco. */
  protected readonly rolesAMostrar = computed(() => this.roles().join(', ') || 'Sin rol asignado');
}
