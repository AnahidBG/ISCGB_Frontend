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
import { AuthService } from '../../core/auth/auth.service';
import { destinoSegunRoles } from '../../core/auth/destino-por-rol';
import { normalizarDni } from '../../core/auth/dni';
import { rolPrincipalDe } from '../../core/auth/rol-principal';
import { CampanaService } from '../../core/notificaciones/campana.service';
import { Boton } from '../../shared/ui/boton/boton';
import { enlacesPorSesion } from '../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../shared/ui/estructura-panel/estructura-panel';
import { SelectorTema } from '../../shared/ui/selector-tema/selector-tema';

/** Lo que muestra el encabezado debajo del título. */
const SUBTITULO = 'Seguridad y apariencia de tu cuenta.';

/**
 * Configuración: cambio de contraseña desde la cuenta (SCRUM-28).
 *
 * El backend no tiene un endpoint para cambiar la contraseña con la actual
 * (al 19/10/2026 solo existe el recupero por mail). Por eso, en vez de pedir
 * la contraseña actual y la nueva, esta pantalla manda el enlace de recupero
 * al correo de la sesión, con el DNI de la sesión
 * (`AuthService.solicitarRecuperacion` → `POST /api/Auth/recuperar-contrasena`).
 * La contraseña nueva se elige en `/restablecer-password`, como en el recupero.
 *
 * Cuando backend agregue el cambio con la contraseña actual, esta pantalla
 * vuelve al formulario que había diseñado Gonza (rama
 * `feature/cambio-contrasenia-mi-cuenta`).
 *
 * También tiene la tarjeta de Apariencia (claro, oscuro o automático), que es el
 * mismo selector del menú de la persona: ver `SelectorTema` y `TemaService`.
 *
 * Contenedor: es el único que conoce los servicios.
 */
@Component({
  selector: 'app-configuracion',
  imports: [EstructuraPanel, Boton, SelectorTema],
  templateUrl: './configuracion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuracion {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);
  private readonly destruccion = inject(DestroyRef);

  protected readonly subtitulo = SUBTITULO;
  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly rutaPanel = computed(() => destinoSegunRoles(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

  /** El correo al que llega el enlace, o `null` si la sesión no lo trae. */
  protected readonly correo = computed(() => {
    const email = this.sesion()?.email?.trim() ?? '';
    return email === '' ? null : email;
  });

  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);

  /** Falla de conexión o del servidor del último envío. */
  protected readonly errorEnvio = signal<string | null>(null);

  constructor() {
    this.campana.refrescar();
  }

  protected enviarEnlace(): void {
    const dni = normalizarDni(this.sesion()?.dni ?? '');
    if (this.enviando() || dni === '') {
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.auth
      .solicitarRecuperacion(dni)
      .pipe(takeUntilDestroyed(this.destruccion))
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.enviado.set(true);
        },
        error: (fallo: Error) => {
          this.enviando.set(false);
          this.errorEnvio.set(fallo.message);
        },
      });
  }

  /** "¿No te llegó?": vuelve a mostrar el botón de envío. */
  protected volverAEnviar(): void {
    this.enviado.set(false);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
