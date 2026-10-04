import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { formatearDni } from '../../../core/auth/dni';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { aNombreDeArchivo, descargarArchivo } from '../../../core/comun/archivos';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import {
  AdjuntoReconocimiento,
  SolicitudPendiente,
} from '../../../core/reconocimiento-saberes/modelos/solicitud-pendiente';
import { ReconocimientoSaberesService } from '../../../core/reconocimiento-saberes/reconocimiento-saberes.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/** Cómo se llama cada PDF en pantalla y en el nombre del archivo que se baja. */
const ADJUNTOS: readonly { adjunto: AdjuntoReconocimiento; etiqueta: string; archivo: string }[] = [
  { adjunto: 'programa', etiqueta: 'Programa', archivo: 'Programa' },
  { adjunto: 'analitico', etiqueta: 'Analítico', archivo: 'Analitico' },
];

/**
 * Solicitudes de reconocimiento de saberes — la bandeja de Secretaría
 * (SCRUM-30, "Que llegue a Secretaría").
 *
 * Lista lo que mandaron los alumnos desde `/alumno/reconocimiento-saberes`:
 * quién, qué materia del ISCGB, su comentario, y los dos PDF para bajar.
 *
 *   · `GET /api/ReconocimientoSaberes/recibirSolicitudReconocimiento`
 *   · `GET /api/ReconocimientoSaberes/{id}/programa` y `/analitico`
 *
 * Solo Secretario: el backend tiene `[Authorize(Roles = "Secretario")]` en
 * los tres, así que Dirección recibiría 403. La ruta usa el mismo criterio.
 *
 * ⚠️ Qué NO hace, y la pantalla lo dice: marcar una solicitud como resuelta.
 * El backend no tiene ese endpoint (la lista filtra por "sin docente
 * asignado" y no hay forma de asignarlo), y lo que pasa después entre
 * Secretaría, Dirección y el alumno queda fuera del MVP.
 */
@Component({
  selector: 'app-solicitudes-reconocimiento',
  imports: [EstructuraPanel, Icono, PantallaCarga],
  templateUrl: './solicitudes-reconocimiento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolicitudesReconocimiento {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly reconocimiento = inject(ReconocimientoSaberesService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly adjuntos = ADJUNTOS;

  protected readonly solicitudes = signal<SolicitudPendiente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** `"{idSolicitud}-{adjunto}"` del PDF que se está bajando, para bloquear solo ese botón. */
  protected readonly descargando = signal<string | null>(null);

  /** El último PDF que no se pudo bajar, para mostrar el error en SU solicitud. */
  protected readonly errorDescarga = signal<{ idSolicitud: number; mensaje: string } | null>(null);

  constructor() {
    this.campana.refrescar();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.reconocimiento.listarPendientes().subscribe({
      next: (solicitudes) => {
        this.solicitudes.set(solicitudes);
        this.cargando.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.cargando.set(false);
      },
    });
  }

  protected dni(solicitud: SolicitudPendiente): string {
    return solicitud.dni === '' ? 'Sin DNI cargado' : `DNI ${formatearDni(solicitud.dni)}`;
  }

  protected estaDescargando(idSolicitud: number, adjunto: AdjuntoReconocimiento): boolean {
    return this.descargando() === `${idSolicitud}-${adjunto}`;
  }

  protected descargar(solicitud: SolicitudPendiente, adjunto: AdjuntoReconocimiento): void {
    if (this.descargando() !== null) {
      return;
    }
    this.descargando.set(`${solicitud.idSolicitud}-${adjunto}`);
    this.errorDescarga.set(null);

    const archivo = ADJUNTOS.find((a) => a.adjunto === adjunto)?.archivo ?? adjunto;
    const nombre = `Reconocimiento_${aNombreDeArchivo(solicitud.alumno)}_${archivo}.pdf`;

    this.reconocimiento.descargarAdjunto(solicitud.idSolicitud, adjunto).subscribe({
      next: (pdf) => {
        this.descargando.set(null);
        descargarArchivo(pdf, nombre);
      },
      error: (fallo: Error) => {
        this.descargando.set(null);
        this.errorDescarga.set({ idSolicitud: solicitud.idSolicitud, mensaje: fallo.message });
      },
    });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
