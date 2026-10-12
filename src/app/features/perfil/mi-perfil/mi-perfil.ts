import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  throwError,
} from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { misDatosDe } from '../../../core/usuarios/mis-datos';
import { MisDatos } from '../../../core/usuarios/modelos/mis-datos';
import { Provincia } from '../../../core/usuarios/modelos/provincia';
import { UsuarioDetalle } from '../../../core/usuarios/modelos/usuario-detalle';
import {
  MENSAJE_ERROR_CARGAR_MIS_DATOS,
  UsuariosService,
} from '../../../core/usuarios/usuarios.service';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import { DatosDeIdentidad } from './partes/datos-de-identidad/datos-de-identidad';
import { FormularioMisDatos } from './partes/formulario-mis-datos/formulario-mis-datos';

/** El pedido de la persona y de las provincias, con su fase (mismo criterio que `LimiteParciales`). */
type CargaPerfil =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; detalle: UsuarioDetalle; provincias: readonly Provincia[] };

const CARGANDO: CargaPerfil = { fase: 'cargando' };

/** Lo que muestra el encabezado debajo del título. */
const SUBTITULO = 'Actualizá tus datos de contacto.';

/** Lo que se avisa cuando el guardado sale bien. */
const MENSAJE_GUARDADO = 'Tus datos se actualizaron.';

/**
 * Mi perfil: cualquier persona con sesión, de cualquier rol, edita sus propios datos
 * de contacto (correo, teléfonos, contacto de emergencia, dirección y lugar de
 * nacimiento). Nombre, apellido, DNI y roles se muestran pero los actualiza Dirección.
 *
 * Lee con `UsuariosService.obtener` (el `idUsuario` de la sesión) y guarda con
 * `actualizarMiPerfil`, que el backend resuelve con el usuario del token. Si el
 * correo cambia, además se actualiza la sesión (`AuthService.actualizarCorreo`) para
 * que el encabezado lo muestre sin volver a iniciar sesión.
 *
 * Contenedor: es el único que conoce los servicios. Los presentacionales viven en
 * `partes/`: `datos-de-identidad` y `formulario-mis-datos`.
 */
@Component({
  selector: 'app-mi-perfil',
  imports: [EstructuraPanel, PantallaCarga, DatosDeIdentidad, FormularioMisDatos],
  templateUrl: './mi-perfil.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiPerfil {
  private readonly auth = inject(AuthService);
  private readonly usuarios = inject(UsuariosService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly sesion = this.auth.sesion;
  protected readonly subtitulo = SUBTITULO;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** Cada `next` vuelve a pedir los datos: es el "Reintentar". */
  private readonly reintento = new Subject<void>();

  /** Los datos de la persona y las provincias. Un fallo es una fase, no una excepción. */
  protected readonly carga = toSignal(
    this.reintento.pipe(
      startWith(undefined),
      switchMap(() =>
        this.pedirDatos().pipe(
          map(({ detalle, provincias }): CargaPerfil => ({ fase: 'listo', detalle, provincias })),
          // `obtener` y `listarProvincias` fallan con el error crudo de HTTP: la
          // persona ve siempre el mismo texto, el detalle ya quedó en la consola.
          catchError(() =>
            of<CargaPerfil>({ fase: 'error', mensaje: MENSAJE_ERROR_CARGAR_MIS_DATOS }),
          ),
          startWith(CARGANDO),
        ),
      ),
    ),
    { initialValue: CARGANDO },
  );

  protected readonly errorCarga = computed(() => {
    const carga = this.carga();
    return carga.fase === 'error' ? carga.mensaje : null;
  });

  protected readonly detalle = computed(() => {
    const carga = this.carga();
    return carga.fase === 'listo' ? carga.detalle : null;
  });

  protected readonly provincias = computed(() => {
    const carga = this.carga();
    return carga.fase === 'listo' ? carga.provincias : [];
  });

  protected readonly nombreCompleto = computed(() => {
    const detalle = this.detalle();
    return detalle === null ? '' : `${detalle.nombre} ${detalle.apellido}`.trim();
  });

  /**
   * Lo que tiene guardado el servidor. Sale del pedido y se pisa con lo que se guarda
   * acá, sin volver a pedirlo: por eso `linkedSignal` y no `computed`.
   */
  protected readonly datosGuardados = linkedSignal<MisDatos | null>(() => {
    const detalle = this.detalle();
    return detalle === null ? null : misDatosDe(detalle);
  });

  protected readonly guardando = signal(false);
  protected readonly errorGuardado = signal<string | null>(null);
  protected readonly confirmacion = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
  }

  private pedirDatos(): Observable<{ detalle: UsuarioDetalle; provincias: Provincia[] }> {
    const idUsuario = this.sesion()?.idUsuario;
    if (idUsuario === undefined) {
      return throwError(() => new Error(MENSAJE_ERROR_CARGAR_MIS_DATOS));
    }
    return forkJoin({
      detalle: this.usuarios.obtener(idUsuario),
      provincias: this.usuarios.listarProvincias(),
    });
  }

  protected recargar(): void {
    this.reintento.next();
  }

  protected guardar(datos: MisDatos): void {
    this.guardando.set(true);
    this.errorGuardado.set(null);
    this.confirmacion.set(null);

    this.usuarios
      .actualizarMiPerfil(datos)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.datosGuardados.set(datos);
          // Siempre: si el correo no cambió, queda igual.
          this.auth.actualizarCorreo(datos.email);
          this.confirmacion.set(MENSAJE_GUARDADO);
          this.guardando.set(false);
        },
        error: (fallo: Error) => {
          this.errorGuardado.set(fallo.message);
          this.guardando.set(false);
        },
      });
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
