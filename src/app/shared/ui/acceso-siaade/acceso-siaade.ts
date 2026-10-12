import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ENLACE_SIAADE, PerfilSiaade } from '../../../core/configuracion/enlaces-externos';
import { Icono } from '../icono/icono';

/** Tabla por clave: para qué entra cada perfil a SIAADE. */
const DESCRIPCION_POR_PERFIL: Readonly<Record<PerfilSiaade, string>> = {
  alumno: 'Consultá tu situación académica y actualizá tus datos personales.',
  docente: 'Entrá al sistema académico del instituto con tu usuario de docente.',
};

/**
 * El acceso a SIAADE, el sistema académico del instituto (SCRUM-15).
 *
 * SIAADE es un sitio aparte: abre en otra pestaña para no sacar a la persona de
 * ISCGB, y le pide su propio usuario y contraseña. Por eso la tarjeta lo avisa
 * antes del clic.
 *
 * Presentacional: recibe el perfil y elige la dirección que le corresponde. Lo
 * usan el panel del Alumno y el del Docente.
 */
@Component({
  selector: 'app-acceso-siaade',
  imports: [Icono],
  templateUrl: './acceso-siaade.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccesoSiaade {
  /** Quién entra: define la dirección y el texto. */
  readonly perfil = input.required<PerfilSiaade>();

  protected readonly enlace = computed(() => ENLACE_SIAADE[this.perfil()]);
  protected readonly descripcion = computed(() => DESCRIPCION_POR_PERFIL[this.perfil()]);
}
