import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { RevisionJustificativos } from '../../justificativos/revision-justificativos/revision-justificativos';

/**
 * Panel del Secretario.
 *
 * Muestra los justificativos de inasistencia esperando revisión, con datos
 * REALES de `GET /api/Justificativos/pendientes`, y permite aprobarlos o
 * rechazarlos con motivo. Es lo que a Secretaría le toca hacer de verdad
 * (ISCGB-PROJECT.md → "Recepción y validación de justificación", Sprint 1).
 * La lista y la auditoría viven en `RevisionJustificativos`, que también usa
 * el Panel del Director.
 *
 * Antes esta pantalla mostraba documentos de legajo inventados, porque no
 * había endpoint. Ahora los justificativos son reales; los legajos de todo el
 * instituto se revisan en "Control de Legajos".
 */
@Component({
  selector: 'app-panel-secretario',
  imports: [EstructuraPanel, RevisionJustificativos],
  templateUrl: './panel-secretario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSecretario {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /**
   * La campana sale de `CampanaService`, igual en todas las pantallas. Antes
   * esta pantalla armaba la suya solo con los justificativos; ahora el
   * servicio suma además los documentos de legajo esperando revisión (ver
   * `novedadesPendientesDelInstituto`).
   */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  constructor() {
    this.campana.refrescar();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
