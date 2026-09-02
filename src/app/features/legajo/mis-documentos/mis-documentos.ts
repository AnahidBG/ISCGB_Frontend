import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, of, switchAll } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { rolPrincipalDe } from '../../../core/auth/rol-principal';
import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { normalizarTexto } from '../../../core/comun/texto';
import { urlArchivoSubido } from '../../../core/configuracion/api';
import { LegajoService, VeredictoLegajo } from '../../../core/legajos/legajo.service';
import { DocumentoLegajo } from '../../../core/legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import {
  calcularProgresoLegajo,
  documentosSinCargar,
} from '../../../core/legajos/progreso-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { enlacesPorSesion } from '../../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { notificacionesPorRechazos } from '../../../shared/ui/estructura-panel/notificaciones-legajo';
import { Icono } from '../../../shared/ui/icono/icono';
import { InsigniaEstado } from '../../../shared/ui/insignia-estado/insignia-estado';
import { TarjetaMetrica } from '../../../shared/ui/tarjeta-metrica/tarjeta-metrica';

/** Las pestañas de arriba de la lista. */
type Filtro = 'todos' | 'Aprobado' | 'Pendiente' | 'Rechazado' | 'sin-cargar';

const FILTROS: readonly { valor: Filtro; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'Aprobado', etiqueta: 'Aprobados' },
  { valor: 'Pendiente', etiqueta: 'En revisión' },
  { valor: 'Rechazado', etiqueta: 'Rechazados' },
  { valor: 'sin-cargar', etiqueta: 'Sin cargar' },
];

/**
 * Una fila de la lista. Puede ser un documento que ya se subió o uno que
 * falta: los dos se muestran igual, pero el que falta no tiene fecha ni id.
 */
interface FilaDocumento {
  clave: string;
  nombre: string;
  estado: string | null;
  obligatorio: boolean;
  fechaSubida: Date | null;
  fechaVencimiento: Date | null;
  comentario: string | null;
  /** `true` si todavía no lo subió. */
  faltante: boolean;
  /** Cuántas versiones anteriores de este mismo documento hay. */
  intentosPrevios: number;
  /** `null` en las filas "faltante": todavía no existe ningún legajo que auditar. */
  idLegajo: number | null;
  /**
   * El estado tal como vino del servidor, ANTES de los veredictos que se
   * aplicaron en esta misma pantalla. Es lo que ordena la lista — ver
   * `prioridad` y el comentario de `filas`.
   */
  estadoParaOrden: string | null;
  rutaArchivo: string | null;
}

/**
 * Mis Documentos: el legajo completo de quien tiene la sesión abierta, con el
 * motivo de los rechazos y los que todavía no presentó.
 *
 * La comparten Docente y Alumno, igual que "Subir Documento": los dos
 * presentan documentación y lo único que cambia es qué les pide el instituto,
 * que ya lo resuelve `requeridos-por-rol`.
 *
 * Es la versión completa de lo que el panel muestra resumido: el panel lista
 * los 5 más nuevos, acá está todo, con filtros y con los que faltan.
 */
@Component({
  selector: 'app-mis-documentos',
  imports: [EstructuraPanel, InsigniaEstado, TarjetaMetrica, Icono, DatePipe],
  templateUrl: './mis-documentos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisDocumentos {
  private readonly auth = inject(AuthService);
  private readonly legajos = inject(LegajoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly rutaPanel = computed(() => destinoSegunRoles(this.sesion()));
  protected readonly idUsuarioSeleccionado = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const valor = params.get('idUsuario');
        if (valor === null) {
          return null;
        }

        const id = Number(valor);
        return Number.isFinite(id) && id > 0 ? id : null;
      }),
    ),
    { initialValue: null as number | null },
  );
  protected readonly esLegajoAjeno = computed(
    () =>
      this.idUsuarioSeleccionado() !== null &&
      this.idUsuarioSeleccionado() !== this.sesion()?.idUsuario,
  );
  protected readonly tituloLegajo = computed(() =>
    this.esLegajoAjeno() ? 'Legajo del usuario' : 'Mis Documentos',
  );
  protected readonly subtituloLegajo = computed(() =>
    this.esLegajoAjeno()
      ? 'Documentación del usuario y el estado actual de cada documento.'
      : 'Tu documentación institucional y en qué estado está cada cosa.',
  );

  /**
   * A dónde vuelve el "‹ Volver" de arriba del título.
   *
   * Antes esto SIEMPRE mandaba al dashboard propio (`rutaPanel()`), incluso
   * revisando el legajo de otra persona — así que Secretaría o Dirección,
   * después de entrar desde Control de Legajos, volvía a su Panel y no al
   * listado del que había partido: tenía que hacer un clic de más (o usar
   * "atrás" del navegador) para seguir revisando a la siguiente persona.
   * Ahora, con legajo ajeno, vuelve a Control de Legajos — de donde
   * realmente se llega a esta pantalla (ver `ControlLegajos`, botón
   * "Ver legajo").
   */
  protected readonly volverUrl = computed(() =>
    this.esLegajoAjeno() ? '/secretario/control-legajos' : this.rutaPanel(),
  );

  protected readonly filtros = FILTROS;
  protected readonly filtro = signal<Filtro>('todos');

  private readonly idRol = idRolDocumental(this.auth.sesion());

  protected readonly documentos = toSignal(
    this.route.paramMap.pipe(
      map((params) => {
        const valor = params.get('idUsuario');
        if (valor === null) {
          return this.legajos.obtenerLegajoPropio();
        }

        const id = Number(valor);
        if (!Number.isFinite(id) || id <= 0) {
          return this.legajos.obtenerLegajoPropio();
        }

        return this.legajos.obtenerLegajoDeUsuario(id);
      }),
      switchAll(),
    ),
    { initialValue: [] as DocumentoLegajo[] },
  );

  /**
   * Overrides locales de auditoría: aprobar o rechazar acá (legajo ajeno)
   * actualiza esto en vez de refetchear todo el legajo, igual criterio que
   * `aplicarVeredictoLocal` tenía en Control de Legajos antes de este cambio.
   * Clave = `idLegajo`.
   */
  protected readonly overridesAuditoria = signal<
    ReadonlyMap<number, { estado: string; comentario: string | null }>
  >(new Map());

  /** `documentos()` con los overrides de auditoría ya aplicados encima. */
  protected readonly documentosConOverrides = computed(() => {
    const overrides = this.overridesAuditoria();
    if (overrides.size === 0) {
      return this.documentos();
    }
    return this.documentos().map((documento) => {
      const override = overrides.get(documento.id);
      return override === undefined
        ? documento
        : { ...documento, estado: override.estado, comentario: override.comentario };
    });
  });

  protected readonly requeridos = toSignal(
    this.esLegajoAjeno()
      ? of<DocumentoRequerido[]>([])
      : this.idRol === null
        ? of<DocumentoRequerido[]>([])
        : this.legajos.documentosRequeridos(this.idRol),
    { initialValue: [] as DocumentoRequerido[] },
  );

  protected readonly enlaces = computed(() =>
    enlacesPorSesion(this.sesion(), { legajoAjeno: this.esLegajoAjeno() }),
  );

  protected readonly progreso = computed(() =>
    calcularProgresoLegajo(this.documentosConOverrides(), this.requeridos()),
  );

  /** Los obligatorios que todavía no subió. Es el "Sin cargar" del diseño. */
  protected readonly faltantes = computed(() =>
    documentosSinCargar(
      this.documentosConOverrides(),
      this.requeridos().filter((requerido) => requerido.obligatorio),
    ),
  );

  /**
   * El detalle que se despliega al tocar la campana: qué documentos están
   * rechazados y por qué.
   *
   * Sin `url`: ya estamos en la pantalla que los muestra. Con legajo ajeno no
   * se arma nada — quien revisa no necesita que le avisen de rechazos que
   * puso él mismo hace dos segundos.
   */
  protected readonly notificacionesDetalle = computed(() =>
    this.esLegajoAjeno() ? [] : notificacionesPorRechazos(this.documentosConOverrides()),
  );

  protected readonly resumen = computed(() => {
    const documentos = this.documentosConOverrides();
    return {
      aprobados: documentos.filter((d) => d.estado === 'Aprobado').length,
      pendientes: documentos.filter((d) => d.estado === 'Pendiente').length,
      rechazados: documentos.filter((d) => d.estado === 'Rechazado').length,
      sinCargar: this.faltantes().length,
    };
  });

  /**
   * Todo junto: lo subido y lo que falta.
   *
   * De cada tipo de documento se muestra SOLO la última versión. El backend
   * crea una fila nueva cada vez que se resube (nunca actualiza la vieja),
   * así que un rechazado que se corrigió deja dos filas del mismo documento.
   * Mostrar las dos le hace creer a la persona que sigue teniendo algo
   * rechazado cuando ya lo arregló. El historial completo lo ve Secretaría en
   * Control de Legajos, que es a quien le sirve.
   */
  protected readonly filas = computed<FilaDocumento[]>(() => {
    // El estado ORIGINAL de cada documento, para ordenar la lista con él.
    //
    // ⚠️ Sin esto, aprobar o rechazar reordenaba la lista debajo del cursor:
    // el documento recién aprobado se iba al fondo y otro subía a ocupar su
    // lugar. En la demo del 02/09/2026 se leyó como si el sistema le hubiera
    // CAMBIADO EL NOMBRE al documento ("Certificado de reincidencia" pasó a
    // decir "Certificado de Salud"), cuando en realidad era otra fila que se
    // había corrido a esa posición. Ordenando por el estado con el que la
    // pantalla se cargó, cada fila se queda donde está y solo cambia su
    // insignia; el orden nuevo se ve al recargar.
    const estadoOriginalPorLegajo = new Map<number, string | null>(
      this.documentos().map((documento) => [documento.id, documento.estado]),
    );

    const obligatorios = new Set(
      this.requeridos()
        .filter((requerido) => requerido.obligatorio)
        .map((requerido) => normalizarTexto(requerido.nombreDocumento)),
    );

    // Agrupa por tipo y se queda con el más nuevo de cada uno.
    const porTipo = new Map<string, DocumentoLegajo[]>();
    for (const documento of this.documentosConOverrides()) {
      const clave = normalizarTexto(documento.nombre);
      porTipo.set(clave, [...(porTipo.get(clave) ?? []), documento]);
    }

    const subidos: FilaDocumento[] = [...porTipo.values()].map((versiones) => {
      const ordenadas = [...versiones].sort(
        (a, b) => b.fechaSubida.getTime() - a.fechaSubida.getTime(),
      );
      const ultima = ordenadas[0];

      return {
        clave: `doc-${ultima.id}`,
        nombre: ultima.nombre,
        estado: ultima.estado,
        obligatorio: obligatorios.has(normalizarTexto(ultima.nombre)),
        fechaSubida: ultima.fechaSubida,
        fechaVencimiento: ultima.fechaVencimiento,
        comentario: ultima.comentario,
        faltante: false,
        intentosPrevios: ordenadas.length - 1,
        idLegajo: ultima.id,
        estadoParaOrden: estadoOriginalPorLegajo.get(ultima.id) ?? ultima.estado,
        rutaArchivo: ultima.rutaArchivo ?? null,
      };
    });

    const faltantes: FilaDocumento[] = this.faltantes().map((requerido) => ({
      clave: `falta-${requerido.idTipoDoc}`,
      nombre: requerido.nombreDocumento,
      estado: null,
      obligatorio: true,
      fechaSubida: null,
      fechaVencimiento: null,
      comentario: null,
      faltante: true,
      intentosPrevios: 0,
      idLegajo: null,
      estadoParaOrden: null,
      rutaArchivo: null,
    }));

    return [...subidos, ...faltantes].sort(
      (a, b) => prioridad(a) - prioridad(b) || a.nombre.localeCompare(b.nombre, 'es'),
    );
  });

  protected readonly filasVisibles = computed(() => {
    const filtro = this.filtro();

    switch (filtro) {
      case 'todos':
        return this.filas();
      case 'sin-cargar':
        return this.filas().filter((fila) => fila.faltante);
      default:
        return this.filas().filter((fila) => !fila.faltante && fila.estado === filtro);
    }
  });

  /** `true` si el documento venció. Un anual del año pasado ya no sirve. */
  protected estaVencido(fila: FilaDocumento): boolean {
    return fila.fechaVencimiento !== null && fila.fechaVencimiento.getTime() < Date.now();
  }

  protected cambiarFiltro(filtro: Filtro): void {
    this.filtro.set(filtro);
  }

  protected irASubir(): void {
    this.router.navigate(['/legajo/subir-documento']);
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }

  // ── Auditoría (aprobar/rechazar) ──────────────────────────────────────────
  //
  // Antes esto SOLO existía en Control de Legajos (fila-documento-legajo),
  // que mostraba los documentos de todo el instituto sueltos en una lista
  // plana. Al mover "Ver Legajos" a listar personas y no documentos (ver
  // ControlLegajos), la revisión pasó a vivir acá, en el perfil de cada
  // persona — que es justamente donde tiene que estar: revisando UN legajo
  // por vez, con el resto del contexto de esa persona a la vista.
  //
  // Esta pantalla la puede abrir cualquiera de los cuatro roles (para su
  // propio legajo), pero `esLegajoAjeno()` solo da `true` cuando quien mira
  // es Secretaría o Dirección revisando a otra persona — la única situación
  // en la que `roleGuard` deja entrar con un `idUsuario` en la URL que no es
  // el propio (ver `app.routes.ts`, ruta `legajo/usuario/:idUsuario`). Por
  // eso alcanza con ese único chequeo para decidir si se muestran los
  // botones de aprobar/rechazar.

  /** `idLegajo` del documento con un pedido de auditoría en curso. */
  protected readonly guardando = signal<ReadonlySet<number>>(new Set());

  /** Error de la última auditoría que falló, sin tapar la pantalla entera. */
  protected readonly errorAuditoria = signal<string | null>(null);

  /** Qué fila tiene abierto el cuadro de confirmar aprobación o el de motivo. */
  protected readonly accionEnCurso = signal<{
    idLegajo: number;
    modo: 'aprobar' | 'rechazar';
  } | null>(null);

  protected readonly motivoRechazo = signal('');

  protected estaGuardando(idLegajo: number | null): boolean {
    return idLegajo !== null && this.guardando().has(idLegajo);
  }

  protected urlDelArchivo(fila: FilaDocumento): string | null {
    return urlArchivoSubido(fila.rutaArchivo);
  }

  protected accionAbiertaPara(fila: FilaDocumento): 'aprobar' | 'rechazar' | null {
    const accion = this.accionEnCurso();
    return accion !== null && accion.idLegajo === fila.idLegajo ? accion.modo : null;
  }

  /**
   * Aprobar pide confirmación pero NO pide motivo — mismo criterio que tenía
   * `FilaDocumentoLegajo`: escribir por qué está bien un documento que está
   * bien es trabajo al pedo.
   */
  protected iniciarAprobacion(fila: FilaDocumento): void {
    if (fila.idLegajo === null || this.estaGuardando(fila.idLegajo) || fila.estado === 'Aprobado') {
      return;
    }
    this.motivoRechazo.set('');
    this.accionEnCurso.set({ idLegajo: fila.idLegajo, modo: 'aprobar' });
  }

  protected iniciarRechazo(fila: FilaDocumento): void {
    if (fila.idLegajo === null || this.estaGuardando(fila.idLegajo) || fila.estado === 'Rechazado') {
      return;
    }
    this.motivoRechazo.set('');
    this.accionEnCurso.set({ idLegajo: fila.idLegajo, modo: 'rechazar' });
  }

  protected cancelarAccion(): void {
    this.accionEnCurso.set(null);
    this.motivoRechazo.set('');
  }

  protected confirmarAprobacion(): void {
    const accion = this.accionEnCurso();
    if (accion === null) {
      return;
    }
    this.accionEnCurso.set(null);
    this.enviarAuditoria(accion.idLegajo, 'Aprobado', null);
  }

  protected confirmarRechazo(): void {
    const accion = this.accionEnCurso();
    if (accion === null) {
      return;
    }
    const texto = this.motivoRechazo().trim();
    this.accionEnCurso.set(null);
    this.motivoRechazo.set('');
    this.enviarAuditoria(accion.idLegajo, 'Rechazado', texto.length > 0 ? texto : null);
  }

  private enviarAuditoria(
    idLegajo: number,
    veredicto: VeredictoLegajo,
    comentario: string | null,
  ): void {
    const idAuditor = this.sesion()?.idUsuario;
    if (idAuditor === undefined) {
      return;
    }

    this.marcarGuardando(idLegajo, true);
    this.errorAuditoria.set(null);

    this.legajos.auditar(idLegajo, veredicto, idAuditor, comentario).subscribe({
      next: () => this.aplicarVeredictoLocal(idLegajo, veredicto, comentario),
      error: (fallo: Error) => {
        this.errorAuditoria.set(fallo.message);
        this.marcarGuardando(idLegajo, false);
      },
      complete: () => this.marcarGuardando(idLegajo, false),
    });
  }

  /**
   * Actualiza el estado en memoria en vez de refetchear el legajo entero,
   * igual criterio que tenía Control de Legajos antes de este cambio.
   */
  private aplicarVeredictoLocal(
    idLegajo: number,
    veredicto: VeredictoLegajo,
    comentario: string | null,
  ): void {
    this.overridesAuditoria.update((mapa) => {
      const nuevo = new Map(mapa);
      nuevo.set(idLegajo, { estado: veredicto, comentario });
      return nuevo;
    });
  }

  private marcarGuardando(idLegajo: number, activo: boolean): void {
    this.guardando.update((actual) => {
      const siguiente = new Set(actual);
      if (activo) {
        siguiente.add(idLegajo);
      } else {
        siguiente.delete(idLegajo);
      }
      return siguiente;
    });
  }
}

/**
 * Primero lo que hay que resolver, después lo que ya está.
 *
 * Ordena por `estadoParaOrden` (el estado con el que se cargó la pantalla) y
 * no por `estado` (que ya puede tener encima un veredicto de hace dos
 * segundos): así las filas no se mueven de lugar mientras alguien revisa.
 */
function prioridad(fila: FilaDocumento): number {
  if (fila.estadoParaOrden === 'Rechazado') return 0;
  if (fila.faltante) return 1;
  if (fila.estadoParaOrden === 'Pendiente') return 2;
  if (fila.estadoParaOrden === 'Aprobado') return 4;
  return 3;
}

