import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { ReconocimientoSaberesService } from '../../../core/reconocimiento-saberes/reconocimiento-saberes.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { ZonaArchivo } from '../../../shared/ui/zona-archivo/zona-archivo';

/** Los dos PDF que pide el criterio de aceptación, en el orden en que se muestran. */
type Adjunto = 'programa' | 'analitico';

/**
 * Solicitar Reconocimiento de Saberes — Sprint 2 (SCRUM-30, subtarea
 * frontend SCRUM-172; diseño SCRUM-174, carga SCRUM-175, progreso SCRUM-176,
 * envío SCRUM-177).
 *
 * El alumno pide que le reconozcan una materia del ISCGB que ya aprobó en
 * otra institución:
 *
 *   · "Materia del ISCGB" con su comentario (el criterio pide poder escribir
 *     un comentario en esa sección).
 *   · Dos PDF: el programa de la otra institución y el analítico. Solo PDF,
 *     validado por `ZonaArchivo` (regla de negocio #1).
 *   · Barra de progreso: documentos cargados sobre los dos requeridos.
 *   · Botones Adjuntar (cada zona), Cancelar y Enviar solicitud.
 *
 * ⚠️ El backend todavía no tiene el endpoint (SCRUM-173, "Por hacer"). La
 * pantalla está completa y, si el servidor responde que la ruta no existe,
 * le dice al alumno que lo presente en Secretaría en vez de fingir que se
 * envió. El contrato propuesto está en docs/contrato-reconocimiento-saberes.md.
 */
@Component({
  selector: 'app-reconocimiento-saberes',
  imports: [EstructuraPanel, Icono, ZonaArchivo],
  templateUrl: './reconocimiento-saberes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReconocimientoSaberes {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly servicio = inject(ReconocimientoSaberesService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  protected readonly materia = signal('');
  protected readonly comentario = signal('');
  protected readonly programa = signal<File | null>(null);
  protected readonly analitico = signal<File | null>(null);

  /** Error de validación de un archivo (no es PDF, pesa demasiado), por zona. */
  protected readonly errorArchivo = signal<Partial<Record<Adjunto, string>>>({});

  protected readonly seIntentoEnviar = signal(false);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);

  protected readonly totalRequeridos = 2;

  /** SCRUM-176: cantidad de documentos cargados sobre los requeridos. */
  protected readonly cargados = computed(
    () => (this.programa() === null ? 0 : 1) + (this.analitico() === null ? 0 : 1),
  );

  protected readonly porcentaje = computed(() =>
    Math.round((this.cargados() / this.totalRequeridos) * 100),
  );

  protected readonly errorMateria = computed(() =>
    this.seIntentoEnviar() && this.materia().trim() === ''
      ? 'Escribí qué materia del ISCGB querés que te reconozcan.'
      : null,
  );

  protected elegir(adjunto: Adjunto, archivo: File): void {
    (adjunto === 'programa' ? this.programa : this.analitico).set(archivo);
    this.errorArchivo.update((errores) => ({ ...errores, [adjunto]: undefined }));
  }

  protected quitar(adjunto: Adjunto): void {
    (adjunto === 'programa' ? this.programa : this.analitico).set(null);
  }

  protected rechazar(adjunto: Adjunto, mensaje: string): void {
    this.errorArchivo.update((errores) => ({ ...errores, [adjunto]: mensaje }));
  }

  protected faltaArchivo(adjunto: Adjunto): boolean {
    const archivo = adjunto === 'programa' ? this.programa() : this.analitico();
    return this.seIntentoEnviar() && archivo === null;
  }

  protected enviar(): void {
    this.seIntentoEnviar.set(true);
    this.error.set(null);

    const sesion = this.sesion();
    const programa = this.programa();
    const analitico = this.analitico();
    const materia = this.materia().trim();

    if (sesion === null || programa === null || analitico === null || materia === '') {
      return;
    }
    if (this.enviando()) {
      return;
    }

    this.enviando.set(true);
    const comentario = this.comentario().trim();

    this.servicio
      .enviar({
        idUsuario: sesion.idUsuario,
        materiaIscgb: materia,
        comentario: comentario === '' ? null : comentario,
        programaOtraInstitucion: programa,
        analitico,
      })
      .subscribe({
        next: (mensaje) => {
          this.enviando.set(false);
          this.mensajeExito.set(mensaje);
        },
        error: (fallo: Error) => {
          this.enviando.set(false);
          this.error.set(fallo.message);
        },
      });
  }

  protected volverAlPanel(): void {
    this.router.navigate(['/alumno/panel']);
  }

  constructor() {
    this.campana.refrescar();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
