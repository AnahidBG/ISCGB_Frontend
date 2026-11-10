import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, Subject, catchError, map, of, startWith, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { descargarArchivo } from '../../../core/comun/archivos';
import { nombreDeDescarga } from '../../../core/contratos/contratos-alumno';
import { ContratosService } from '../../../core/contratos/contratos.service';
import { ContratoAlumno } from '../../../core/contratos/modelos/contrato-alumno';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { ListaContratos } from '../../../shared/ui/lista-contratos/lista-contratos';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';

/** En qué está el pedido de los contratos. */
type CargaContratos =
  | { fase: 'cargando' }
  | { fase: 'listo'; contratos: ContratoAlumno[] }
  | { fase: 'error'; mensaje: string };

/**
 * Mis contratos — Alumno (SCRUM-227).
 *
 * Los contratos firmados que le cargaron Dirección o Secretaría, como el
 * convenio de la beca, para verlos y descargarlos. Se llega desde el menú.
 *
 * El panel del Alumno también los muestra, pero solo cuando hay alguno y sin
 * avisar si el pedido falla. Acá sí se avisa, con "Reintentar", porque es la
 * pantalla a la que el alumno entra a buscarlos.
 */
@Component({
  selector: 'app-mis-contratos',
  imports: [EstructuraPanel, ListaContratos, PantallaCarga],
  templateUrl: './mis-contratos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisContratos {
  private readonly auth = inject(AuthService);
  private readonly contratosService = inject(ContratosService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** Cada `next` vuelve a pedir los contratos: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  protected readonly carga = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() => this.pedirContratos()),
    ),
    { initialValue: { fase: 'cargando' } as CargaContratos },
  );

  protected readonly descargando = signal<number | null>(null);
  protected readonly errorDescarga = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
  }

  protected reintentar(): void {
    this.reintento.next();
  }

  protected descargar(contrato: ContratoAlumno): void {
    if (this.descargando() !== null) {
      return;
    }
    this.descargando.set(contrato.idContrato);
    this.errorDescarga.set(null);

    this.contratosService
      .descargar(contrato.idContrato)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (pdf) => {
          this.descargando.set(null);
          descargarArchivo(pdf, nombreDeDescarga(contrato.nombre));
        },
        error: (fallo: Error) => {
          this.descargando.set(null);
          this.errorDescarga.set(fallo.message);
        },
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

  /** Un fallo llega como fase `error`, no como excepción. */
  private pedirContratos(): Observable<CargaContratos> {
    return this.contratosService.misContratos().pipe(
      map((contratos): CargaContratos => ({ fase: 'listo', contratos })),
      catchError((fallo: Error) => of<CargaContratos>({ fase: 'error', mensaje: fallo.message })),
      startWith<CargaContratos>({ fase: 'cargando' }),
    );
  }
}
