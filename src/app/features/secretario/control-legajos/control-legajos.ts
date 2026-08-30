import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { ROLES } from '../../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';
import { inicialesDe, normalizarTexto } from '../../../core/comun/texto';
import { LegajoService, VeredictoLegajo } from '../../../core/legajos/legajo.service';
import {
  DocumentoResumenLegajo,
  LegajoResumenUsuario,
} from '../../../core/legajos/modelos/legajo-resumen';
import {
  MapaTiposDocumento,
  aprenderNombresDeTipos,
  nombreTipoDocumento,
} from '../../../core/legajos/tipos-documento';
import { ENLACES_COMUNES } from '../../../shared/ui/estructura-panel/enlaces-comunes';
import { EnlacePanel, EstructuraPanel } from '../../../shared/ui/estructura-panel/estructura-panel';
import { PantallaCarga } from '../../../shared/ui/pantalla-carga/pantalla-carga';
import {
  AuditoriaDocumentoEvento,
  FilaDocumentoLegajo,
} from './partes/fila-documento-legajo/fila-documento-legajo';

/** Conteo por estado de un usuario, para el resumen de su tarjeta. */
interface ConteoEstados {
  aprobados: number;
  pendientes: number;
  rechazados: number;
  /** Cualquier valor que no sea uno de los tres del semáforo — incluye `null`. */
  otros: number;
  total: number;
}

/**
 * Control de Legajos: los documentos de todo el instituto agrupados por
 * persona, para que Secretaría o Dirección los apruebe o rechace.
 *
 * Contenedor: es el único que conoce `LegajoService`; las filas son
 * presentacionales.
 *
 * Hace dos llamadas porque `resumen-estado` trae la estructura pero manda
 * `idTipoDoc` sin el nombre, y `pendientes` sí trae el nombre. Cruzándolas
 * por `idLegajo` se saca qué nombre va con cada id (ver `tipos-documento.ts`).
 *
 * No pongo barra de progreso porque `resumen-estado` no manda el rol de cada
 * persona, y sin eso no sé cuántos documentos le corresponden. Muestro los
 * conteos y listo, mejor que inventar un porcentaje.
 */
@Component({
  selector: 'app-control-legajos',
  imports: [EstructuraPanel, PantallaCarga, FilaDocumentoLegajo],
  templateUrl: './control-legajos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlLegajos {
  private readonly auth = inject(AuthService);
  private readonly legajoService = inject(LegajoService);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  protected readonly resumen = signal<LegajoResumenUsuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Nombres de tipo de documento aprendidos del cruce con `/pendientes`. */
  protected readonly nombresDeTipos = signal<MapaTiposDocumento>(new Map());

  /** Error de la última auditoría que falló, sin tapar la pantalla entera. */
  protected readonly errorAuditoria = signal<string | null>(null);

  /** `idLegajo` de los documentos con un pedido de auditoría en curso. */
  protected readonly guardando = signal<ReadonlySet<number>>(new Set());

  /** Filtro de texto: nombre o DNI. Vacío muestra todo. */
  protected readonly busqueda = signal('');

  /** `true` esconde a quien no tenga ningún documento esperando revisión. */
  protected readonly soloPendientes = signal(false);

  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const esDirector = tieneAlgunRol(this.sesion(), [ROLES.director]);

    return [
      {
        etiqueta: 'Dashboard',
        url: esDirector ? '/director/panel' : '/secretario/panel',
        icono: 'panel',
      },
      { etiqueta: 'Control de Legajos', url: '/secretario/control-legajos', icono: 'legajo' },
      ...ENLACES_COMUNES,
    ];
  });

  /** Cuántos documentos hay esperando revisión en todo el instituto. */
  protected readonly totalPendientes = computed(() =>
    this.resumen().reduce(
      (total, usuario) =>
        total + usuario.documentos.filter((d) => d.estado === 'Pendiente').length,
      0,
    ),
  );

  /**
   * Lo que se dibuja, filtrado y ordenado. El orden importa: el endpoint
   * devuelve todos los usuarios, muchos sin ningún documento.
   */
  protected readonly usuariosFiltrados = computed(() => {
    const texto = normalizarTexto(this.busqueda());
    const soloPendientes = this.soloPendientes();

    const filtrados = this.resumen().filter((usuario) => {
      if (soloPendientes && !this.tienePendientes(usuario)) {
        return false;
      }
      if (texto === '') {
        return true;
      }
      return (
        normalizarTexto(usuario.nombreCompleto).includes(texto) || usuario.dni.includes(texto)
      );
    });

    return [...filtrados].sort((a, b) => {
      const pendientesA = this.conteos(a).pendientes;
      const pendientesB = this.conteos(b).pendientes;

      // 1° quien tiene documentos esperando revisión (y quien tiene más).
      if (pendientesA !== pendientesB) {
        return pendientesB - pendientesA;
      }
      // 2° quien al menos subió algo, antes que las fichas vacías.
      if (a.documentos.length !== b.documentos.length) {
        return b.documentos.length - a.documentos.length;
      }
      // 3° alfabético, para que el orden sea estable y predecible.
      return a.nombreCompleto.localeCompare(b.nombreCompleto, 'es');
    });
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    // En paralelo, no dependen entre sí. Si una falla, forkJoin corta: sin
    // el resumen no hay nada que dibujar, y sin los pendientes los nombres
    // salen del mapa hardcodeado sin que nadie se entere.
    forkJoin({
      resumen: this.legajoService.obtenerResumenInstitucional(),
      pendientes: this.legajoService.listarParaRevision(),
    }).subscribe({
      next: ({ resumen, pendientes }) => {
        this.resumen.set(resumen);
        this.nombresDeTipos.set(aprenderNombresDeTipos(resumen, pendientes));
        this.cargando.set(false);
      },
      error: (fallo: Error) => {
        this.error.set(fallo.message);
        this.cargando.set(false);
      },
    });
  }

  protected nombreDelDocumento(documento: DocumentoResumenLegajo): string {
    return nombreTipoDocumento(documento.idTipoDoc, this.nombresDeTipos());
  }

  protected readonly iniciales = inicialesDe;

  protected conteos(usuario: LegajoResumenUsuario): ConteoEstados {
    const documentos = usuario.documentos;
    const aprobados = documentos.filter((d) => d.estado === 'Aprobado').length;
    const pendientes = documentos.filter((d) => d.estado === 'Pendiente').length;
    const rechazados = documentos.filter((d) => d.estado === 'Rechazado').length;
    const total = documentos.length;

    return {
      aprobados,
      pendientes,
      rechazados,
      otros: total - aprobados - pendientes - rechazados,
      total,
    };
  }

  protected tienePendientes(usuario: LegajoResumenUsuario): boolean {
    return usuario.documentos.some((documento) => documento.estado === 'Pendiente');
  }

  protected estaGuardando(idLegajo: number): boolean {
    return this.guardando().has(idLegajo);
  }

  protected alternarSoloPendientes(): void {
    this.soloPendientes.update((valor) => !valor);
  }

  protected onAuditar(
    usuario: LegajoResumenUsuario,
    documento: DocumentoResumenLegajo,
    evento: AuditoriaDocumentoEvento,
  ): void {
    const idAuditor = this.sesion()?.idUsuario;
    if (idAuditor === undefined) {
      return;
    }

    this.marcarGuardando(documento.idLegajo, true);
    this.errorAuditoria.set(null);

    this.legajoService
      .auditar(documento.idLegajo, evento.veredicto, idAuditor, evento.comentario)
      .subscribe({
        next: () =>
          this.aplicarVeredictoLocal(usuario.idUsuario, documento.idLegajo, evento.veredicto),
        error: (fallo: Error) => {
          this.errorAuditoria.set(fallo.message);
          this.marcarGuardando(documento.idLegajo, false);
        },
        complete: () => this.marcarGuardando(documento.idLegajo, false),
      });
  }

  /**
   * Actualiza el estado en memoria en vez de recargar todo el resumen, que
   * trae el instituto entero y haría parpadear las tarjetas que no cambiaron.
   */
  private aplicarVeredictoLocal(
    idUsuario: number,
    idLegajo: number,
    veredicto: VeredictoLegajo,
  ): void {
    this.resumen.update((lista) =>
      lista.map((usuario) => {
        if (usuario.idUsuario !== idUsuario) {
          return usuario;
        }
        return {
          ...usuario,
          documentos: usuario.documentos.map((documento) =>
            documento.idLegajo === idLegajo ? { ...documento, estado: veredicto } : documento,
          ),
        };
      }),
    );
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

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}

