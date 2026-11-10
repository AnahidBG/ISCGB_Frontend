import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { ConCambiosSinEnviar } from '../../../core/comun/confirmar-salida.guard';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { tipoPedidoEn } from '../../../core/legajos/tipo-en-url';
import { DialogoConfirmacion } from '../../../shared/ui/dialogo-confirmacion/dialogo-confirmacion';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
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
 * ── Se sacó "Nombre / Descripción" (02/09/2026) ───────────────────────────
 * A pedido de Dirección en la demo. Era texto libre y no tenía a dónde ir: el
 * DTO del backend (`SubirLegajoDto`) no tiene campo de descripción, y el
 * archivo en disco lo nombra el propio backend con el TIPO de documento
 * (`ISCGB_NombreApellido_TipoDocumento_fecha.pdf`, ver `LegajosController`).
 * Lo único que lograba era que la misma cosa se llamara distinto en cada
 * legajo — "Certificado de reincidencia" vs. el tipo real — y que la lista de
 * documentos mostrara dos nombres para un solo papel.
 *
 * ── Entrega en papel: nadie la declara al subir (04/10/2026) ──────────────
 * Acá no hay casilla "También entregué este documento en Secretaría", para
 * ningún rol: solo el recordatorio rojo. La casilla se sacó el 02/09/2026 a
 * pedido de Dirección, volvió unas horas para el Docente el 04/10/2026 y se
 * volvió a sacar el mismo día: quien la tilda sin haber llevado el papel
 * queda igual de "presentado" en el sistema. Que el papel está lo marca quien
 * lo recibe y lo coteja —Secretaría o Dirección— al revisar el legajo (ver
 * `MisDocumentos`, legajo ajeno), y queda guardado con la auditoría. Subir un
 * documento no manda nada sobre el papel.
 *
 * La validación de PDF que hace esta pantalla es SOLO por comodidad: avisa
 * antes de subir algo que va a fallar. La validación de verdad va del lado
 * del servidor, mirando el contenido del archivo — nunca confiar en lo que
 * manda el navegador (regla #1). Desde el 10/11/2026 el backend la hace por
 * magic bytes (`Seguridad/ValidadorArchivos.cs`), aunque en legajos todavía
 * acepta también JPG y PNG (CLAUDE.md, regla 1).
 *
 * ── Salir sin guardar (SCRUM-42 Docente, SCRUM-113 Alumno) ────────────────
 * Si la persona eligió un archivo y se va sin tocar "Subir documento", el
 * archivo no llega al legajo. Antes de dejarla ir se le avisa con el texto
 * que pide el requerimiento: "Cargaste documentación nueva, debes Guardar
 * para que se registre". Igual que en `EntregaPrograma`, son dos caminos:
 *
 *   · Navegar dentro de la app ("‹ Volver", "Cancelar", la barra lateral, la
 *     campana, cerrar sesión) pasa por `confirmarSalidaGuard` → nuestro diálogo.
 *   · Cerrar la pestaña o recargar no pasa por el router → `beforeunload`, con
 *     el diálogo genérico del navegador (ninguno deja poner un texto propio).
 *
 * Lo que cuenta como "sin guardar" es solo el archivo: elegir el tipo o la
 * fecha sin archivo no carga documentación, y preguntar ahí sería molestar.
 */
@Component({
  selector: 'app-subir-documento',
  imports: [EstructuraPanel, Icono, ZonaArchivo, DialogoConfirmacion],
  templateUrl: './subir-documento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'alSalirDelSitio($event)',
  },
})
export class SubirDocumento implements ConCambiosSinEnviar {
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly legajos = inject(LegajoService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly sesion = this.auth.sesion;

  /** El rol que se muestra en el encabezado. Sale SIEMPRE de la sesión. */
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));

  /** La campana del encabezado, igual en todas las pantallas (`CampanaService`). */
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;

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

  /**
   * La consulta de la URL como signal. Es la del observable y no la del
   * `snapshot` porque la campana también está en esta pantalla: tocar otro
   * "Falta entregar" cambia el `?tipo=` sin crear el componente de nuevo.
   */
  private readonly consulta = toSignal(this.ruta.queryParamMap, { requireSync: true });

  /**
   * El tipo elegido. Arranca con el que pide el enlace (`?tipo=`, lo arman la
   * tarjeta "Documentación por entregar" y la campana) cuando es uno de los
   * de su rol (`tipoPedidoEn`), y la persona lo puede cambiar en el select.
   *
   * `linkedSignal` y no `signal` + `effect`: se vuelve a calcular solo cuando
   * cambian la URL o la lista de tipos, que llega después. En el medio
   * conserva lo que eligió la persona.
   */
  protected readonly idTipoElegido = linkedSignal<number | null>(() =>
    tipoPedidoEn(this.consulta(), this.tiposDisponibles()),
  );
  protected readonly archivo = signal<File | null>(null);
  protected readonly fechaVencimiento = signal('');

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exito = signal(false);

  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

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
    () => this.idTipoElegido() !== null && this.archivo() !== null && !this.enviando(),
  );

  // ── Salir sin guardar ─────────────────────────────────────────────────────

  /**
   * `true` si hay un archivo elegido que todavía no se subió. Mientras se está
   * subiendo no cuenta: el pedido ya salió y termina aunque se cambie de
   * pantalla, así que decirle "debes Guardar" sería falso.
   */
  private readonly hayAlgoSinGuardar = computed(
    () => this.archivo() !== null && !this.exito() && !this.enviando(),
  );

  /** `true` mientras se muestra el aviso de "debes Guardar". */
  protected readonly preguntandoSalida = signal(false);

  /** Resuelve la navegación pendiente con la respuesta del diálogo. */
  private resolverSalida: ((salir: boolean) => void) | null = null;

  constructor() {
    this.campana.refrescar();
    this.cargarTipos();
  }

  confirmarSalida(): boolean | Promise<boolean> {
    if (!this.hayAlgoSinGuardar()) {
      return true;
    }

    // Si ya había una pregunta abierta (por ejemplo, apretó "atrás" en el
    // navegador con el diálogo a la vista), esa navegación quedó vieja: se
    // cierra como "no salir" antes de abrir la nueva.
    this.resolverSalida?.(false);

    this.preguntandoSalida.set(true);
    return new Promise<boolean>((resolver) => (this.resolverSalida = resolver));
  }

  protected responderSalida(salir: boolean): void {
    this.preguntandoSalida.set(false);
    this.resolverSalida?.(salir);
    this.resolverSalida = null;
  }

  /** Cerrar la pestaña o recargar: le pide al navegador su diálogo de confirmación. */
  protected alSalirDelSitio(evento: BeforeUnloadEvent): void {
    if (this.hayAlgoSinGuardar()) {
      evento.preventDefault();
      // Chrome y Edge viejos solo muestran el diálogo si además se asigna esto.
      evento.returnValue = '';
    }
  }

  protected alElegirTipo(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.idTipoElegido.set(valor === '' ? null : Number(valor));
  }

  protected alElegirFecha(evento: Event): void {
    this.fechaVencimiento.set((evento.target as HTMLInputElement).value);
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
        archivo: elegido,
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
    this.archivo.set(null);
    this.fechaVencimiento.set('');
    this.exito.set(false);
    this.error.set(null);
  }

  protected volverAlPanel(): void {
    this.router.navigate([this.rutaPanel()]);
  }

  protected cerrarSesion(): void {
    // Primero se navega y recién después se corta la sesión: si el guard
    // pregunta y la persona elige quedarse a guardar, la navegación se cancela
    // y la sesión tiene que seguir viva (mismo criterio que `EntregaPrograma`).
    this.router.navigate(['/login']).then((salio) => {
      if (salio) {
        this.auth.cerrarSesion();
      }
    });
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
