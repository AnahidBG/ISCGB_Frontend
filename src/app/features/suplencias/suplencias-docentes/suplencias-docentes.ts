import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { MateriasService } from '../../../core/materias/materias.service';
import { DocenteDisponible } from '../../../core/materias/modelos/asignacion-materia';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NuevaSuplencia } from '../../../core/suplencias/modelos/suplencia';
import { mensajeDeSuplencia } from '../../../core/suplencias/nueva-suplencia';
import { SuplenciasService } from '../../../core/suplencias/suplencias.service';
import { DialogoConfirmacion } from '../../../shared/ui/dialogo-confirmacion/dialogo-confirmacion';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { BajaSuplencia } from './partes/baja-suplencia/baja-suplencia';
import { FormularioSuplencia } from './partes/formulario-suplencia/formulario-suplencia';

/**
 * Suplencias docentes — Dirección y Secretaría.
 *
 * CONTENEDOR: trae los docentes (`MateriasService.listarDocentes`, que es la
 * lista que tiene el `idDocente`) y habla con `SuplenciasService`:
 *
 *   · Asignar: marca al docente como suplente desde una fecha y, si se sabe,
 *     hasta otra. El backend le reactiva la cuenta y le da el rol Docente.
 *   · Dar de baja: cuando vuelve el titular. Le quita el acceso como docente, y
 *     si no tiene otro rol, la cuenta queda inactiva. Por eso pide confirmación.
 *
 * El backend no tiene un GET de las suplencias vigentes, así que la pantalla no
 * las lista. El formulario y la baja viven en `partes/`.
 */
@Component({
  selector: 'app-suplencias-docentes',
  imports: [
    EstructuraPanel,
    PantallaCarga,
    FormularioSuplencia,
    BajaSuplencia,
    DialogoConfirmacion,
  ],
  templateUrl: './suplencias-docentes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuplenciasDocentes {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly materias = inject(MateriasService);
  private readonly suplencias = inject(SuplenciasService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly hoy = new Date();

  protected readonly docentes = signal<DocenteDisponible[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly asignando = signal(false);
  protected readonly errorAsignar = signal<string | null>(null);
  protected readonly exitoAsignar = signal<string | null>(null);
  protected readonly reinicioAsignar = signal(0);

  /** El docente al que se le está por dar de baja la suplencia: abre la confirmación. */
  protected readonly bajaPorConfirmar = signal<DocenteDisponible | null>(null);
  protected readonly dandoDeBaja = signal(false);
  protected readonly errorBaja = signal<string | null>(null);
  protected readonly exitoBaja = signal<string | null>(null);
  protected readonly reinicioBaja = signal(0);

  constructor() {
    this.campana.refrescar();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.materias
      .listarDocentes()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (docentes) => {
          this.docentes.set(docentes);
          this.cargando.set(false);
        },
        error: (fallo: Error) => {
          this.errorCarga.set(fallo.message);
          this.cargando.set(false);
        },
      });
  }

  protected asignar(suplencia: NuevaSuplencia): void {
    if (this.asignando()) {
      return;
    }
    this.asignando.set(true);
    this.errorAsignar.set(null);
    this.exitoAsignar.set(null);
    const nombre = this.nombreDe(suplencia.idDocente);

    this.suplencias
      .asignar(suplencia)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (resultado) => {
          this.asignando.set(false);
          this.exitoAsignar.set(mensajeDeSuplencia(nombre, resultado, suplencia));
          this.reinicioAsignar.update((n) => n + 1);
        },
        error: (fallo: Error) => {
          this.asignando.set(false);
          this.errorAsignar.set(fallo.message);
        },
      });
  }

  protected pedirBaja(docente: DocenteDisponible): void {
    this.errorBaja.set(null);
    this.exitoBaja.set(null);
    this.bajaPorConfirmar.set(docente);
  }

  protected cancelarBaja(): void {
    this.bajaPorConfirmar.set(null);
  }

  protected confirmarBaja(): void {
    const docente = this.bajaPorConfirmar();
    if (docente === null || this.dandoDeBaja()) {
      return;
    }
    this.bajaPorConfirmar.set(null);
    this.dandoDeBaja.set(true);

    this.suplencias
      .darDeBaja(docente.idDocente)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (resultado) => {
          this.dandoDeBaja.set(false);
          this.exitoBaja.set(mensajeDeSuplencia(docente.nombreCompleto, resultado));
          this.reinicioBaja.update((n) => n + 1);
        },
        error: (fallo: Error) => {
          this.dandoDeBaja.set(false);
          this.errorBaja.set(fallo.message);
        },
      });
  }

  private nombreDe(idDocente: number): string {
    return (
      this.docentes().find((docente) => docente.idDocente === idDocente)?.nombreCompleto ??
      'El docente'
    );
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
