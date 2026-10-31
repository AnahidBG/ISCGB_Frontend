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
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/modelos/rol';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { descargarArchivo } from '../../../core/comun/archivos';
import { nombreDeDescarga } from '../../../core/contratos/contratos-alumno';
import { ContratosService } from '../../../core/contratos/contratos.service';
import { ContratoAlumno, NuevoContrato } from '../../../core/contratos/modelos/contrato-alumno';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { UsuarioInstitucional } from '../../../core/usuarios/modelos/usuario-institucional';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { ListaContratos } from '../../../shared/ui/lista-contratos/lista-contratos';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { FormularioContrato } from './partes/formulario-contrato/formulario-contrato';

/** Los alumnos con la cuenta activa, por orden alfabético: a quiénes se les puede cargar un contrato. */
function alumnosActivos(personas: UsuarioInstitucional[]): UsuarioInstitucional[] {
  return personas
    .filter((persona) => persona.activo && persona.roles.includes(ROLES.alumno))
    .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
}

/**
 * Contratos de alumnos — Secretaría (SCRUM-227).
 *
 * CONTENEDOR: trae a los alumnos (`UsuariosService.listar`) y habla con
 * `ContratosService`. Secretaría elige al alumno, carga el contrato firmado y
 * sellado (un PDF) y ve los que ya tiene. El alumno los ve en su panel.
 *
 * El formulario vive en `partes/`; la lista es `shared/ui/lista-contratos`,
 * la misma que ve el alumno.
 */
@Component({
  selector: 'app-contratos-alumnos',
  imports: [EstructuraPanel, PantallaCarga, FormularioContrato, ListaContratos],
  templateUrl: './contratos-alumnos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContratosAlumnos {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly usuarios = inject(UsuariosService);
  private readonly contratos = inject(ContratosService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  protected readonly alumnos = signal<UsuarioInstitucional[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly cargandoContrato = signal(false);
  protected readonly errorContrato = signal<string | null>(null);
  protected readonly exitoContrato = signal<string | null>(null);
  protected readonly reinicio = signal(0);

  /** El alumno elegido en el formulario: sus contratos se muestran al lado. */
  protected readonly idAlumno = signal<number | null>(null);
  protected readonly alumno = computed(
    () => this.alumnos().find((a) => a.idUsuario === this.idAlumno()) ?? null,
  );
  protected readonly contratosDelAlumno = signal<ContratoAlumno[]>([]);
  protected readonly cargandoLista = signal(false);
  protected readonly errorLista = signal<string | null>(null);
  private pedidoLista: Subscription | null = null;

  protected readonly descargando = signal<number | null>(null);
  protected readonly errorDescarga = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.usuarios
      .listar()
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (personas) => {
          this.alumnos.set(alumnosActivos(personas));
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set(
            'No pudimos traer la lista de alumnos. Intentá de nuevo en un momento.',
          );
          this.cargando.set(false);
        },
      });
  }

  protected elegirAlumno(idUsuario: number | null): void {
    this.idAlumno.set(idUsuario);
    this.errorContrato.set(null);
    this.exitoContrato.set(null);
    this.errorDescarga.set(null);
    this.cargarLista();
  }

  /** Los contratos del alumno elegido. Un pedido viejo se cancela si se elige otro alumno. */
  protected cargarLista(): void {
    this.pedidoLista?.unsubscribe();
    this.contratosDelAlumno.set([]);
    this.errorLista.set(null);
    const idUsuario = this.idAlumno();
    if (idUsuario === null) {
      this.cargandoLista.set(false);
      return;
    }

    this.cargandoLista.set(true);
    this.pedidoLista = this.contratos
      .listarDeAlumno(idUsuario)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (contratos) => {
          this.contratosDelAlumno.set(contratos);
          this.cargandoLista.set(false);
        },
        error: (fallo: Error) => {
          this.errorLista.set(fallo.message);
          this.cargandoLista.set(false);
        },
      });
  }

  protected cargarContrato(contrato: NuevoContrato): void {
    if (this.cargandoContrato()) {
      return;
    }
    this.cargandoContrato.set(true);
    this.errorContrato.set(null);
    this.exitoContrato.set(null);

    this.contratos
      .cargar(contrato)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: (mensaje) => {
          this.cargandoContrato.set(false);
          this.exitoContrato.set(mensaje);
          this.reinicio.update((n) => n + 1);
          this.cargarLista();
        },
        error: (fallo: Error) => {
          this.cargandoContrato.set(false);
          this.errorContrato.set(fallo.message);
        },
      });
  }

  protected descargar(contrato: ContratoAlumno): void {
    if (this.descargando() !== null) {
      return;
    }
    this.descargando.set(contrato.idContrato);
    this.errorDescarga.set(null);

    this.contratos
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
}
