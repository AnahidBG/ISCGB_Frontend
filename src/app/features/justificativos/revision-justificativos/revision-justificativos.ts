import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { urlArchivoSubido } from '../../../core/configuracion/api';
import {
  AuditoriaJustificativo,
  JustificativosService,
  VeredictoAuditoria,
} from '../../../core/justificativos/justificativos.service';
import { JustificativoPendiente } from '../../../core/justificativos/modelos/justificativo-pendiente';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { CuadroRechazo } from '../../../shared/ui/cuadro-rechazo/cuadro-rechazo';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/**
 * Los justificativos de inasistencia que esperan revisión, para aprobarlos o
 * rechazarlos (`GET /api/Justificativos/pendientes` y `PUT .../auditar/{id}`).
 *
 * Lo usan el Panel del Secretario y el Panel del Director: el backend deja
 * auditar a los dos (`RolesAdministrativos`). Antes solo lo tenía Secretaría y
 * Dirección veía los pendientes en la campana sin poder hacer nada; así el
 * justificativo de un Secretario lo puede revisar el Director.
 *
 * Rechazar pide al menos un motivo, siempre: desde el 10/11/2026 el backend se
 * lo manda por correo a la persona, y sin él no sabe qué corregir. Son los
 * mismos motivos de la institución que los del legajo (`CuadroRechazo`, regla
 * #4). El motivo no se guarda en la base, así que no aparece en ninguna
 * pantalla.
 *
 * CONTENEDOR: habla con `JustificativosService` y refresca la campana. Va
 * dentro de la `EstructuraPanel` de cada panel, no trae la suya.
 */
@Component({
  selector: 'app-revision-justificativos',
  imports: [PantallaCarga, CuadroRechazo, DatePipe],
  templateUrl: './revision-justificativos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class RevisionJustificativos {
  private readonly justificativos = inject(JustificativosService);
  private readonly campana = inject(CampanaService);

  protected readonly pendientes = signal<JustificativoPendiente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** El id del justificativo que se está guardando, para bloquear los botones. */
  protected readonly guardando = signal<number | null>(null);

  /** El justificativo que tiene abierto el cuadro de rechazo, o `null`. */
  protected readonly rechazando = signal<number | null>(null);

  /** Qué se resolvió en esta sesión, para confirmarlo sin recargar la lista entera. */
  protected readonly ultimoResuelto = signal<{
    nombre: string;
    veredicto: VeredictoAuditoria;
  } | null>(null);

  constructor() {
    this.cargar();
  }

  protected urlDelArchivo(justificativo: JustificativoPendiente): string | null {
    return urlArchivoSubido(justificativo.rutaArchivo);
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.justificativos.listarPendientes().subscribe({
      next: (lista) => {
        this.pendientes.set(lista);
        this.cargando.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.cargando.set(false);
      },
    });
  }

  protected aprobar(justificativo: JustificativoPendiente): void {
    this.cancelarRechazo();
    this.auditar(justificativo, { veredicto: 'Aprobado' });
  }

  /** Abre el cuadro de rechazo. Todavía no se guarda nada. */
  protected pedirMotivo(justificativo: JustificativoPendiente): void {
    this.rechazando.set(justificativo.idJustificativo);
  }

  protected cancelarRechazo(): void {
    this.rechazando.set(null);
  }

  /** Recibe el comentario ya armado por `CuadroRechazo`: nunca llega vacío. */
  protected confirmarRechazo(justificativo: JustificativoPendiente, motivo: string): void {
    this.auditar(justificativo, { veredicto: 'Rechazado', motivo });
  }

  private auditar(justificativo: JustificativoPendiente, auditoria: AuditoriaJustificativo): void {
    if (this.guardando() !== null) {
      return;
    }
    this.guardando.set(justificativo.idJustificativo);
    this.error.set(null);

    this.justificativos.auditar(justificativo.idJustificativo, auditoria).subscribe({
      next: () => {
        // Se saca de la lista en vez de volver a pedirla: el endpoint solo
        // devuelve pendientes, así que este ya no estaría. Evita un viaje
        // de ida y vuelta y que la lista parpadee.
        this.pendientes.update((lista) =>
          lista.filter((j) => j.idJustificativo !== justificativo.idJustificativo),
        );
        this.ultimoResuelto.set({
          nombre: justificativo.nombreDocente,
          veredicto: auditoria.veredicto,
        });
        this.guardando.set(null);
        this.cancelarRechazo();
        // Resolver uno baja el número de la campana.
        this.campana.refrescar();
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.guardando.set(null);
      },
    });
  }
}
