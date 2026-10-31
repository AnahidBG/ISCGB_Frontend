import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { LIBROS_DE_TEMAS } from '../../../core/configuracion/enlaces-externos';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';

/**
 * Libro de temas — Docente (SCRUM-232).
 *
 * El libro de temas no vive en ISCGB: cada año de la carrera tiene su carpeta en
 * el Google Drive del instituto. Esta pantalla es el paso intermedio: el docente
 * elige el año y la carpeta se abre en otra pestaña. Las carpetas están en
 * `LIBROS_DE_TEMAS` (`core/configuracion/enlaces-externos.ts`).
 */
@Component({
  selector: 'app-libro-de-temas',
  imports: [EstructuraPanel, Icono],
  templateUrl: './libro-de-temas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibroDeTemas {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly libros = LIBROS_DE_TEMAS;

  constructor() {
    this.campana.refrescar();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
