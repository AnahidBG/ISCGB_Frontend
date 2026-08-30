import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { ROLES } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { aNombreDeArchivo } from '../../../core/comun/archivos';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { ENLACES_COMUNES } from '../../../shared/ui/estructura-panel/enlaces-comunes';
import {
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
import { Icono } from '../../../shared/ui/icono/icono';
import { ZonaArchivo } from '../../../shared/ui/zona-archivo/zona-archivo';

/**
 * Subir un documento al legajo propio.
 *
 * Sigue la plantilla de Figma "Subir Documento": tipo, nombre, y una zona
 * grande donde arrastrar el archivo.
 *
 * ⚠️ Dos diferencias con ese diseño, las dos a propósito:
 *
 *   1. **Solo PDF.** El Figma dice "PDF, JPG, PNG", pero la regla de negocio
 *      #1 del MVP es tajante: solo `.PDF`, "ni siquiera temporalmente o para
 *      probar". Un legajo institucional que acepta capturas de pantalla deja
 *      de servir como legajo. Hay que corregirlo en el Figma.
 *
 *   2. **El tipo de documento es una lista, no texto libre.** El backend
 *      guarda `id_tipo_doc`, un número que apunta a la tabla
 *      `tipos_documentos`. Un campo de texto libre no tendría a dónde ir, y
 *      además haría que cada persona escriba "DNI", "dni copia" o "Fotocopia
 *      del DNI" para la misma cosa. La lista sale de
 *      `GET /api/Legajos/requeridos-por-rol/{idRol}`: son exactamente los
 *      documentos que el instituto le pide a este rol.
 *
 * La validación de PDF que hace esta pantalla es SOLO por comodidad: avisa
 * antes de subir algo que va a fallar. La validación de verdad va del lado
 * del servidor, mirando el contenido del archivo — nunca confiar en lo que
 * manda el navegador (regla #1). Hoy el backend no la hace todavía; está
 * anotado en docs/verificacion-backend.md.
 */
@Component({
  selector: 'app-subir-documento',
  imports: [EstructuraPanel, Icono, ZonaArchivo],
  templateUrl: './subir-documento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubirDocumento {
  private readonly auth = inject(AuthService);
  private readonly legajos = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /** El primer rol de la sesión, para mostrarlo debajo del nombre. */
  protected readonly rolPrincipal = computed(() => this.sesion()?.roles[0] ?? '');

  /**
   * A dónde vuelve el "‹ Volver" (y el botón "Cancelar" del formulario).
   *
   * Reusa `destinoSegunRoles`: la misma pregunta que ya resuelve el login
   * ("¿a qué panel corresponde esta sesión?"), aplicada acá al camino de
   * vuelta. Antes esto elegía a mano entre `/alumno/panel` y `/docente/panel`,
   * lo cual mandaba mal a alguien con doble rol Director + Docente (lo
   * devolvía a Docente en vez de a Director).
   */
  protected readonly rutaPanel = computed(() => destinoSegunRoles(this.sesion()));

  protected readonly tiposDisponibles = signal<DocumentoRequerido[]>([]);
  protected readonly cargandoTipos = signal(true);

  protected readonly idTipoElegido = signal<number | null>(null);
  protected readonly descripcion = signal('');
  protected readonly archivo = signal<File | null>(null);
  protected readonly fechaVencimiento = signal('');
  protected readonly presentadoFisico = signal(false);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal(false);

  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const enlaces: EnlacePanel[] = [
      { etiqueta: 'Dashboard', url: this.rutaPanel(), icono: 'panel' },
      { etiqueta: 'Subir Documento', url: '/legajo/subir-documento', icono: 'subir' },
    ];

    if (tieneAlgunRol(this.sesion(), [ROLES.docente])) {
      enlaces.push({
        etiqueta: 'Entregar programa de materia',
        url: '/docente/entrega-programa',
        icono: 'legajo',
      });
    }

    enlaces.push(...ENLACES_COMUNES);
    return enlaces;
  });

  /** El tipo elegido, completo. Sirve para saber si vence o no. */
  protected readonly tipoElegido = computed(() =>
    this.tiposDisponibles().find((t) => t.idTipoDoc === this.idTipoElegido()) ?? null,
  );

  /**
   * Solo los documentos anuales piden fecha de vencimiento. Pedírsela a un
   * título de grado, que no vence nunca, es hacer trabajar de más a la
   * persona y ensuciar el dato.
   */
  protected readonly pideVencimiento = computed(() => this.tipoElegido()?.anual === true);

  protected readonly puedeEnviar = computed(
    () =>
      this.idTipoElegido() !== null &&
      this.archivo() !== null &&
      this.descripcion().trim() !== '' &&
      !this.enviando(),
  );

  constructor() {
    this.cargarTipos();
  }

  protected alElegirTipo(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.idTipoElegido.set(valor === '' ? null : Number(valor));
  }

  protected alEscribirDescripcion(evento: Event): void {
    this.descripcion.set((evento.target as HTMLInputElement).value);
  }

  protected alElegirFecha(evento: Event): void {
    this.fechaVencimiento.set((evento.target as HTMLInputElement).value);
  }

  protected alMarcarFisico(evento: Event): void {
    this.presentadoFisico.set((evento.target as HTMLInputElement).checked);
  }

  protected alElegirArchivo(archivo: File): void {
    this.archivo.set(archivo);
    this.error.set(null);
  }

  protected quitarArchivo(): void {
    this.archivo.set(null);
    this.error.set(null);
  }

  protected enviar(): void {
    const idUsuario = this.sesion()?.idUsuario;
    const idTipoDoc = this.idTipoElegido();
    const elegido = this.archivo();

    if (idUsuario === undefined || idTipoDoc === null || elegido === null) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.legajos
      .subirDocumento({
        idUsuario,
        idTipoDoc,
        fechaVencimiento: this.fechaAEnviar(),
        presentadoFisico: this.presentadoFisico(),
        archivo: this.archivoConNombre(elegido),
      })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.exito.set(true);
        },
        error: (fallo: Error) => {
          this.enviando.set(false);
          this.error.set(fallo.message);
        },
      });
  }

  protected subirOtro(): void {
    this.idTipoElegido.set(null);
    this.descripcion.set('');
    this.archivo.set(null);
    this.fechaVencimiento.set('');
    this.presentadoFisico.set(false);
    this.exito.set(false);
    this.error.set(null);
  }

  protected volverAlPanel(): void {
    this.router.navigate([this.rutaPanel()]);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

  /**
   * Renombra el archivo con la descripción que escribió la persona.
   *
   * El DTO del backend (`SubirLegajoDto`) no tiene ningún campo para un
   * nombre o descripción: lo único que viaja del archivo es su nombre. Y hoy
   * el backend guarda como `{Guid}_{nombre original}`, así que el nombre del
   * archivo ES el único lugar donde esta descripción puede llegar.
   *
   * Se limpia de acentos y caracteres raros porque termina siendo un nombre
   * de archivo en disco, y ahí una barra o dos puntos rompen la ruta.
   *
   * Cuando el backend implemente el renombrado de la regla #2
   * (`ISCGB_NombreyApellido_NombreDocumento`), este texto es el que va en la
   * última parte.
   */
  private archivoConNombre(original: File): File {
    const limpio = aNombreDeArchivo(this.descripcion());

    if (limpio === '') {
      return original;
    }

    return new File([original], `${limpio}.pdf`, { type: original.type });
  }

  /** El input de fecha da "2026-08-27"; el backend espera una fecha completa. */
  private fechaAEnviar(): Date | null {
    if (!this.pideVencimiento() || this.fechaVencimiento() === '') {
      return null;
    }
    return new Date(`${this.fechaVencimiento()}T00:00:00`);
  }

  private cargarTipos(): void {
    const sesion = this.sesion();

    // Qué documentos le pedimos a esta persona depende de su rol. La regla
    // de cuál elegir cuando tiene varios vive en `idRolDocumental` — la misma
    // que usan los paneles de Docente y Alumno para calcular el progreso.
    const idRol = idRolDocumental(sesion);

    if (idRol === null) {
      this.cargandoTipos.set(false);
      this.error.set(
        'No pudimos saber qué documentos te corresponden. Cerrá sesión y volvé a entrar.',
      );
      return;
    }

    this.legajos.documentosRequeridos(idRol).subscribe({
      next: (tipos) => {
        this.tiposDisponibles.set(tipos);
        this.cargandoTipos.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.cargandoTipos.set(false);
      },
    });
  }
}
