import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { urlArchivoSubido } from '../../../core/configuracion/api';
import { JustificativoPendiente } from '../../../core/justificativos/modelos/justificativo-pendiente';
import {
  JustificativosService,
  VeredictoAuditoria,
} from '../../../core/justificativos/justificativos.service';
import {
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/**
 * Panel del Secretario.
 *
 * Muestra los justificativos de inasistencia esperando revisión, con datos
 * REALES de `GET /api/Justificativos/pendientes`, y permite aprobarlos o
 * rechazarlos. Es lo que a Secretaría le toca hacer de verdad
 * (ISCGB-PROJECT.md → "Recepción y validación de justificación", Sprint 1).
 *
 * Antes esta pantalla mostraba documentos de legajo inventados, porque no
 * había endpoint. Ahora los justificativos son reales; los legajos de todo el
 * instituto siguen sin endpoint (solo se pueden pedir de a un usuario), así
 * que esa sección se sacó en vez de dejarla con datos falsos.
 *
 * ⚠️ Sobre rechazar: la regla de negocio #4 de CLAUDE.md pide que rechazar
 * dispare un email automático al docente. El backend todavía NO lo hace. Por
 * eso la pantalla se lo dice explícitamente a quien revisa — el botón existe
 * porque el endpoint existe, pero callar que el aviso no sale solo haría que
 * alguien lo dé por hecho y el docente nunca se entere.
 */
@Component({
  selector: 'app-panel-secretario',
  imports: [EstructuraPanel, PantallaCarga, DatePipe],
  templateUrl: './panel-secretario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelSecretario {
  private readonly auth = inject(AuthService);
  private readonly justificativos = inject(JustificativosService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  protected readonly pendientes = signal<JustificativoPendiente[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** El id del justificativo que se está guardando, para bloquear solo esa fila. */
  protected readonly guardando = signal<number | null>(null);

  /** Qué se resolvió en esta sesión, para confirmarlo sin recargar la lista entera. */
  protected readonly ultimoResuelto = signal<{
    nombre: string;
    veredicto: VeredictoAuditoria;
  } | null>(null);

  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const enlaces: EnlacePanel[] = [{ etiqueta: 'Dashboard', url: '/secretario/panel' }];

    if (tieneAlgunRol(this.sesion(), [ROLES.docente])) {
      enlaces.push({
        etiqueta: 'Entregar programa de materia',
        url: '/docente/entrega-programa',
      });
    }

    return enlaces;
  });

  constructor() {
    this.cargar();
  }

  protected urlDelArchivo(justificativo: JustificativoPendiente): string | null {
    return urlArchivoSubido(justificativo.rutaArchivo);
  }

  protected aprobar(justificativo: JustificativoPendiente): void {
    this.auditar(justificativo, 'Aprobado');
  }

  protected rechazar(justificativo: JustificativoPendiente): void {
    this.auditar(justificativo, 'Rechazado');
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

  private auditar(
    justificativo: JustificativoPendiente,
    veredicto: VeredictoAuditoria,
  ): void {
    const idAuditor = this.sesion()?.idUsuario;
    if (idAuditor === undefined) {
      return;
    }

    this.guardando.set(justificativo.idJustificativo);
    this.error.set(null);

    this.justificativos
      .auditar(justificativo.idJustificativo, veredicto, idAuditor)
      .subscribe({
        next: () => {
          // Se saca de la lista en vez de volver a pedirla: el endpoint solo
          // devuelve pendientes, así que este ya no estaría. Evita un viaje
          // de ida y vuelta y que la lista parpadee.
          this.pendientes.update((lista) =>
            lista.filter((j) => j.idJustificativo !== justificativo.idJustificativo),
          );
          this.ultimoResuelto.set({ nombre: justificativo.nombreDocente, veredicto });
          this.guardando.set(null);
        },
        error: (fallo: Error) => {
          this.error.set(fallo.message);
          this.guardando.set(null);
        },
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
