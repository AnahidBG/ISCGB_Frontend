import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { formatearDni } from '../../../core/auth/dni';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import {
  CertificadosService,
  VarianteCertificado,
} from '../../../core/certificados/certificados.service';
import { descargarArchivo } from '../../../core/comun/archivos';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';

/**
 * Certificado de alumno regular — Sprint 2, "Solicitud de certificado de
 * alumno regular (Estudiante)" (SCRUM-12, subtarea frontend SCRUM-119).
 *
 * Una sola pantalla para las dos variantes; cuál es la decide la ruta
 * (`data.variante`):
 *
 *   · `regular`             → `/alumno/certificado/regular`
 *   · `regular-con-horario` → `/alumno/certificado/regular-con-horario`
 *
 * El PDF lo genera el BACKEND (`GET /api/Certificados/...`, con el sello y
 * el nombre del instituto). Antes se armaba en el navegador con jsPDF, sin
 * sello, y la variante con horario figuraba como "Próximamente" aunque el
 * backend ya la tenía. Ahora la pantalla solo pide el archivo y lo descarga.
 *
 * Criterios de aceptación:
 *   · "Debe haber iniciado sesión" → `authGuard` + `roleGuard(alumno)`, y el
 *     backend lo exige con `[Authorize]`.
 *   · "Debe tener los datos personales completos" → se avisa antes de pedir
 *     si la sesión no trae nombre o DNI, y si el backend responde 400 se
 *     muestra su motivo.
 *   · Fecha de emisión, nombre, DNI, logo/sello y nombre del instituto, PDF
 *     → los pone el backend.
 */
@Component({
  selector: 'app-certificado-regular',
  imports: [EstructuraPanel, Icono, RouterLink],
  templateUrl: './certificado-regular.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificadoRegular {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly certificados = inject(CertificadosService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  protected readonly variante: VarianteCertificado =
    this.route.snapshot.data['variante'] === 'regular-con-horario'
      ? 'regular-con-horario'
      : 'regular';

  protected readonly conHorario = this.variante === 'regular-con-horario';

  protected readonly titulo = this.conHorario
    ? 'Certificado de alumno regular con horario'
    : 'Certificado de alumno regular';

  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly generado = signal(false);

  /**
   * Con nombre y DNI alcanza para este certificado: son los datos personales
   * que usa. Si faltan, no tiene sentido ni pedirlo — el backend respondería
   * 400 — y la única salida es Secretaría.
   */
  protected readonly datosCompletos = computed(() => {
    const sesion = this.sesion();
    return sesion !== null && sesion.nombreCompleto.trim() !== '' && sesion.dni.trim() !== '';
  });

  protected readonly dniFormateado = computed(() => {
    const sesion = this.sesion();
    return sesion ? formatearDni(sesion.dni) : '';
  });

  protected descargar(): void {
    const sesion = this.sesion();
    if (sesion === null || !this.datosCompletos() || this.generando()) {
      return;
    }

    this.generando.set(true);
    this.error.set(null);
    this.generado.set(false);

    this.certificados.descargar(this.variante).subscribe({
      next: (archivo) => {
        const sufijo = this.conHorario ? '_Horario' : '';
        descargarArchivo(archivo, `Certificado_Alumno_Regular${sufijo}_${sesion.dni}.pdf`);
        this.generado.set(true);
        this.generando.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.generando.set(false);
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
