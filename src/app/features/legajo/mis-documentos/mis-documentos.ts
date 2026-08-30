import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map, of, switchAll } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { destinoSegunRoles } from '../../../core/auth/destino-por-rol';
import { ROLES } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { normalizarTexto } from '../../../core/comun/texto';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { DocumentoLegajo } from '../../../core/legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import {
  calcularProgresoLegajo,
  documentosSinCargar,
} from '../../../core/legajos/progreso-legajo';
import { idRolDocumental } from '../../../core/legajos/rol-documental';
import { ENLACES_COMUNES } from '../../../shared/ui/estructura-panel/enlaces-comunes';
import {
  EnlacePanel,
  EstructuraPanel,
} from '../../../shared/ui/estructura-panel/estructura-panel';
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
  protected readonly rolPrincipal = computed(() => this.sesion()?.roles[0] ?? '');
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

  protected readonly requeridos = toSignal(
    this.esLegajoAjeno()
      ? of<DocumentoRequerido[]>([])
      : this.idRol === null
        ? of<DocumentoRequerido[]>([])
        : this.legajos.documentosRequeridos(this.idRol),
    { initialValue: [] as DocumentoRequerido[] },
  );

  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const enlaces: EnlacePanel[] = [
      { etiqueta: 'Dashboard', url: this.rutaPanel(), icono: 'panel' },
    ];

    if (this.esLegajoAjeno()) {
      enlaces.push({
        etiqueta: 'Control de Legajos',
        url: '/secretario/control-legajos',
        icono: 'legajo',
      });
    } else {
      enlaces.push({
        etiqueta: 'Mis Documentos',
        url: '/legajo/mis-documentos',
        icono: 'legajo',
      });
      enlaces.push({ etiqueta: 'Subir Documento', url: '/legajo/subir-documento', icono: 'subir' });
    }

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

  protected readonly progreso = computed(() =>
    calcularProgresoLegajo(this.documentos(), this.requeridos()),
  );

  /** Los obligatorios que todavía no subió. Es el "Sin cargar" del diseño. */
  protected readonly faltantes = computed(() =>
    documentosSinCargar(
      this.documentos(),
      this.requeridos().filter((requerido) => requerido.obligatorio),
    ),
  );

  protected readonly resumen = computed(() => {
    const documentos = this.documentos();
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
    const obligatorios = new Set(
      this.requeridos()
        .filter((requerido) => requerido.obligatorio)
        .map((requerido) => normalizarTexto(requerido.nombreDocumento)),
    );

    // Agrupa por tipo y se queda con el más nuevo de cada uno.
    const porTipo = new Map<string, DocumentoLegajo[]>();
    for (const documento of this.documentos()) {
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
}

/** Primero lo que hay que resolver, después lo que ya está. */
function prioridad(fila: FilaDocumento): number {
  if (fila.estado === 'Rechazado') return 0;
  if (fila.faltante) return 1;
  if (fila.estado === 'Pendiente') return 2;
  if (fila.estado === 'Aprobado') return 4;
  return 3;
}

