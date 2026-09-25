import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { jsPDF } from 'jspdf';
import { AuthService } from '../../../core/auth/auth.service';
import { formatearDni } from '../../../core/auth/dni';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';

/**
 * Certificado de alumno regular (SIN horario) — Sprint 2, "Solicitud de
 * certificado de alumno regular" (Estudiante).
 *
 * Es la variante que SÍ se puede armar hoy, de punta a punta, sin depender
 * de ningún endpoint nuevo: nombre completo, DNI y fecha de emisión salen
 * todos de la sesión ya autenticada (`authGuard` + `roleGuard(alumno)` ya
 * garantizan "debe haber iniciado sesión con anterioridad" — no hay nada
 * más que verificar acá).
 *
 * El PDF se arma en el NAVEGADOR con `jsPDF` (ya es dependencia del
 * proyecto) — no hace falta ningún viaje al servidor. El logo institucional
 * se rasteriza desde el SVG real (`imagenes/logo-iscgb-verde.svg`) a un
 * canvas en memoria y de ahí a la imagen que entiende `jsPDF`.
 *
 * ⚠️ La variante CON horario (`/alumno/certificado/regular-con-horario`)
 * sigue siendo "Próximamente" — necesita los días y horarios de cursada,
 * y ESO no lo expone ningún endpoint del backend hoy (confirmado con
 * Swagger el 25/09/2026). Inventar esos datos violaría la misma regla que
 * ya se aplicó en el resto del sistema: no se muestra un dato que no sale
 * de ningún lado real.
 */
@Component({
  selector: 'app-certificado-regular',
  imports: [EstructuraPanel, Icono],
  templateUrl: './certificado-regular.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertificadoRegular {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly generado = signal(false);

  /**
   * "Debe tener los datos personales completos" (criterio de aceptación).
   * Con nombre y DNI alcanza para ESTE certificado — son los únicos datos
   * personales que de verdad usa. No hay pantalla de "editar mi perfil"
   * para el Alumno todavía, así que si falta algo la única salida es avisar
   * y mandar a Secretaría, no inventar un dato en blanco en el PDF oficial.
   */
  protected readonly datosCompletos = computed(() => {
    const sesion = this.sesion();
    return sesion !== null && sesion.nombreCompleto.trim() !== '' && sesion.dni.trim() !== '';
  });

  protected readonly dniFormateado = computed(() => {
    const sesion = this.sesion();
    return sesion ? formatearDni(sesion.dni) : '';
  });

  protected async descargar(): Promise<void> {
    const sesion = this.sesion();
    if (sesion === null || !this.datosCompletos() || this.generando()) {
      return;
    }

    this.generando.set(true);
    this.error.set(null);

    try {
      const logo = await cargarLogoComoPng();
      const documento = armarCertificado({
        nombreCompleto: sesion.nombreCompleto,
        dni: formatearDni(sesion.dni),
        fechaEmision: new Date(),
        logo,
      });

      documento.save(`Certificado_Alumno_Regular_${sesion.dni}.pdf`);
      this.generado.set(true);
    } catch {
      this.error.set('No pudimos generar el certificado. Intentá de nuevo en un momento.');
    } finally {
      this.generando.set(false);
    }
  }

  protected volverAlPanel(): void {
    this.router.navigate(['/alumno/panel']);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}

/**
 * Rasteriza el logo SVG institucional a un PNG en memoria.
 *
 * `jsPDF.addImage` no entiende SVG directamente — hay que dibujarlo en un
 * `<canvas>` (el navegador sí sabe pintar SVG dentro de una `<img>`) y sacar
 * el PNG de ahí. Se hace en cada descarga y no una sola vez al arrancar
 * porque es liviano (un ícono, no una foto) y así no hay que mantener un
 * estado de "¿ya cargó el logo?" que puede fallar a mitad de camino.
 */
function cargarLogoComoPng(): Promise<string> {
  return new Promise((resolve, reject) => {
    const imagen = new Image();
    imagen.onload = () => {
      const canvas = document.createElement('canvas');
      // 4x el tamaño real del SVG (62×58) para que no se vea pixelado al
      // imprimir el PDF en A4.
      canvas.width = 62 * 4;
      canvas.height = 58 * 4;
      const contexto = canvas.getContext('2d');
      if (contexto === null) {
        reject(new Error('No se pudo preparar el logo.'));
        return;
      }
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    imagen.onerror = () => reject(new Error('No se pudo cargar el logo institucional.'));
    imagen.src = 'imagenes/logo-iscgb-verde.svg';
  });
}

interface DatosCertificado {
  nombreCompleto: string;
  dni: string;
  fechaEmision: Date;
  logo: string;
}

/**
 * Arma el PDF del certificado con `jsPDF`.
 *
 * Mismo criterio visual que `GeneradorPDFPrograma.cs` en el backend (letra
 * institucional, sección de firma y sello como un recuadro para completar a
 * mano) — para que un certificado y un programa de materia impresos se
 * sientan del mismo sistema, aunque uno lo arme el servidor y el otro el
 * navegador.
 */
function armarCertificado(datos: DatosCertificado): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const margen = 25;
  let y = 20;

  // ── Encabezado ────────────────────────────────────────────────────────
  doc.addImage(datos.logo, 'PNG', anchoPagina / 2 - 8, y, 16, 15);
  y += 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Instituto Superior Cura Gabriel Brochero', anchoPagina / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Dirección General de Institutos Privados de Enseñanza', anchoPagina / 2, y, {
    align: 'center',
  });
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('CERTIFICADO DE ALUMNO REGULAR', anchoPagina / 2, y, { align: 'center' });
  y += 18;

  // ── Cuerpo ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const parrafo =
    `Se deja constancia de que ${datos.nombreCompleto}, DNI N.° ${datos.dni}, ` +
    'reviste la condición de alumno/a regular en este instituto.';
  const lineas = doc.splitTextToSize(parrafo, anchoPagina - margen * 2);
  doc.text(lineas, margen, y, { lineHeightFactor: 1.6 });
  y += lineas.length * 7 + 10;

  doc.text(
    `Se extiende el presente certificado a solicitud del interesado/a, para ser presentado ` +
      'ante quien corresponda.',
    margen,
    y,
    { maxWidth: anchoPagina - margen * 2, lineHeightFactor: 1.6 },
  );
  y += 20;

  const fechaTexto = datos.fechaEmision.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.text(`Fecha de emisión: ${fechaTexto}`, margen, y);

  // ── Firma y sello ─────────────────────────────────────────────────────
  const yFirma = doc.internal.pageSize.getHeight() - 60;
  const centroFirma = anchoPagina / 2;
  doc.line(centroFirma - 35, yFirma, centroFirma + 35, yFirma);
  doc.setFontSize(10);
  doc.text('Firma y sello — Secretaría Académica', centroFirma, yFirma + 6, { align: 'center' });

  // ── Pie de página ─────────────────────────────────────────────────────
  const yPie = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 200);
  doc.text('secretaria.academica@icgb.com.ar', anchoPagina / 2, yPie, { align: 'center' });

  return doc;
}
