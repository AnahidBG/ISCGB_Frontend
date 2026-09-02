import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RUTAS_API } from '../configuracion/api';
import { DocumentoLegajo } from './modelos/documento-legajo';
import {
  DocumentoRequerido,
  NuevoDocumentoLegajo,
} from './modelos/documento-requerido';
import { LegajoResumenUsuario } from './modelos/legajo-resumen';
import { ResumenUsuarioLegajo } from './modelos/resumen-usuario-legajo';
import {
  LegajoService,
  MENSAJE_ERROR_AUDITORIA_LEGAJO,
  MENSAJE_ERROR_LEGAJO,
  MENSAJE_ERROR_SUBIDA,
  VeredictoLegajo,
} from './legajo.service';

export const MENSAJE_ERROR_RESUMEN_INSTITUCIONAL =
  'No pudimos traer los legajos del instituto. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_RESUMEN_USUARIOS =
  'No pudimos traer la lista de personas del instituto. Intentá de nuevo en un momento.';

/** Lo que devuelve `GetLegajosPorUsuario` (`LegajoDetalleDto`). */
interface LegajoApi {
  idLegajo: number;
  idUsuario: number;
  tipoDocumento: string | null;
  rutaArchivo: string | null;
  fechaCarga: string;
  fechaVencimiento: string | null;
  estado: string | null;
  presentadoFisico: boolean | null;
  comentario: string | null;
  auditor: string;
}

/** Forma real de `GET /api/Legajos/requeridos-por-rol/{idRol}`. */
interface RequeridosApi {
  rol: string;
  documentos: DocumentoRequerido[];
}

/** Lo que devuelve `GET /api/Legajos/pendientes` (`LegajoPendienteDto`). */
interface LegajoPendienteApi {
  idLegajo: number;
  nombreUsuario: string;
  tipoDocumento: string;
  rutaArchivo: string | null;
  fechaCarga: string;
  presentadoFisico: boolean | null;
}

/**
 * Legajos contra la API real. Las seis operaciones son reales, ya no queda
 * nada simulado acá.
 *
 * Ojo con los 404: casi todos estos endpoints devuelven 404 cuando no hay
 * resultados en vez de una lista vacía, así que lo traduzco a `[]`. Si no, un
 * docente sin documentos vería un error en vez de su legajo vacío.
 */
@Injectable()
export class LegajoHttpService extends LegajoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  obtenerLegajoPropio(): Observable<DocumentoLegajo[]> {
    const idUsuario = this.auth.sesion()?.idUsuario;

    // Sin sesión no hay de quién pedir el legajo. No debería pasar nunca
    // (estas pantallas viven detrás de authGuard), pero mejor no reventar.
    if (idUsuario === undefined) {
      return of([]);
    }

    return this.obtenerLegajoDeUsuario(idUsuario);
  }

  obtenerLegajoDeUsuario(idUsuario: number): Observable<DocumentoLegajo[]> {
    return this.http.get<LegajoApi[]>(RUTAS_API.legajosPorUsuario(idUsuario)).pipe(
      map((legajos) => legajos.map(aDocumentoLegajo)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }
        console.error('Error al traer el legajo:', error);
        return throwError(() => new Error(MENSAJE_ERROR_LEGAJO));
      }),
    );
  }

  documentosRequeridos(idRol: number): Observable<DocumentoRequerido[]> {
    return this.http
      .get<RequeridosApi>(RUTAS_API.documentosRequeridosPorRol(idRol))
      .pipe(
        map((respuesta) => respuesta.documentos ?? []),
        catchError((error: HttpErrorResponse) => {
          // Un 404 acá significa "nadie configuró todavía qué documentos le
          // pedimos a este rol" — falta cargar filas en
          // roles_tipos_documentos. Es un hueco de datos, no un error.
          if (error.status === 404) {
            return of([]);
          }
          console.error('Error al traer los documentos requeridos:', error);
          return throwError(() => new Error(MENSAJE_ERROR_LEGAJO));
        }),
      );
  }

  subirDocumento(documento: NuevoDocumentoLegajo): Observable<void> {
    const cuerpo = new FormData();

    // Los nombres coinciden con `SubirLegajoDto`. ASP.NET no distingue
    // mayúsculas al enlazar el formulario.
    cuerpo.append('idUsuario', String(documento.idUsuario));
    cuerpo.append('idTipoDoc', String(documento.idTipoDoc));
    cuerpo.append('presentadoFisico', String(documento.presentadoFisico));

    if (documento.fechaVencimiento !== null) {
      cuerpo.append('fechaVencimiento', documento.fechaVencimiento.toISOString());
    }

    cuerpo.append('archivo', documento.archivo);

    // Sin `Content-Type` a propósito: el navegador lo pone solo, con el
    // `boundary` que necesita multipart. Ponerlo a mano rompe la subida.
    return this.http.post(RUTAS_API.subirLegajo, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al subir el documento:', error);
        return throwError(() => new Error(MENSAJE_ERROR_SUBIDA));
      }),
    );
  }

  auditar(
    idLegajo: number,
    veredicto: VeredictoLegajo,
    idUsuarioAuditor: number,
    comentario: string | null,
  ): Observable<void> {
    // El auditor va por query string y el veredicto por body: así lo definió
    // el backend (`[FromQuery] int idUsuarioAuditor, [FromBody] dto`).
    return this.http
      .put(RUTAS_API.auditarLegajo(idLegajo, idUsuarioAuditor), {
        estado: veredicto,
        comentario,
      })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) => {
          console.error('Error al auditar el documento:', error);
          return throwError(() => new Error(MENSAJE_ERROR_AUDITORIA_LEGAJO));
        }),
      );
  }

  /**
   * Pendientes de todo el instituto, aplanados al `DocumentoLegajo` que usa
   * el resto de la app. El `estado` va fijo en 'Pendiente' porque el DTO no
   * lo manda pero el endpoint filtra por eso.
   */
  listarParaRevision(): Observable<DocumentoLegajo[]> {
    return this.http.get<LegajoPendienteApi[]>(RUTAS_API.legajosPendientes).pipe(
      map((pendientes) => pendientes.map(aDocumentoPendiente)),
      catchError((error: HttpErrorResponse) => {
        // Este devuelve 200 con [] cuando no hay nada, pero contemplo el 404
        // igual por las dudas.
        if (error.status === 404) {
          return of([]);
        }
        console.error('Error al traer los documentos pendientes:', error);
        return throwError(() => new Error(MENSAJE_ERROR_LEGAJO));
      }),
    );
  }

  /**
   * Todos los legajos agrupados por persona. La respuesta ya coincide con
   * `LegajoResumenUsuario`, pero igual pasa por el mapper para normalizar los
   * huecos (nombre vacío, `documentos` ausente).
   */
  obtenerResumenInstitucional(): Observable<LegajoResumenUsuario[]> {
    return this.http.get<LegajoResumenUsuario[]>(RUTAS_API.legajosResumenEstado).pipe(
      map((resumen) => resumen.map(aLegajoResumenUsuario)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }
        console.error('Error al traer el resumen institucional de legajos:', error);
        return throwError(() => new Error(MENSAJE_ERROR_RESUMEN_INSTITUCIONAL));
      }),
    );
  }

  /**
   * Todas las personas del instituto con conteos por estado, sin la lista de
   * documentos. La usa "Ver Legajos" (ver el comentario en `LegajoService`).
   */
  obtenerResumenUsuarios(): Observable<ResumenUsuarioLegajo[]> {
    return this.http.get<ResumenUsuarioLegajo[]>(RUTAS_API.legajosResumenUsuarios).pipe(
      map((resumen) => resumen.map(aResumenUsuarioLegajo)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }
        console.error('Error al traer la lista de personas del instituto:', error);
        return throwError(() => new Error(MENSAJE_ERROR_RESUMEN_USUARIOS));
      }),
    );
  }
}

function aDocumentoLegajo(legajo: LegajoApi): DocumentoLegajo {
  return {
    id: legajo.idLegajo,
    nombre: legajo.tipoDocumento ?? 'Documento sin nombre',
    estado: legajo.estado,
    fechaSubida: new Date(legajo.fechaCarga),
    comentario: legajo.comentario,
    fechaVencimiento:
      legajo.fechaVencimiento === null ? null : new Date(legajo.fechaVencimiento),
    rutaArchivo: legajo.rutaArchivo,
  };
}

function aDocumentoPendiente(pendiente: LegajoPendienteApi): DocumentoLegajo {
  return {
    id: pendiente.idLegajo,
    nombre: pendiente.tipoDocumento ?? 'Documento sin nombre',
    propietario: pendiente.nombreUsuario,
    estado: 'Pendiente',
    fechaSubida: new Date(pendiente.fechaCarga),
    // `/pendientes` no manda ninguno de los dos.
    comentario: null,
    fechaVencimiento: null,
  };
}

/**
 * Normaliza una fila de `resumen-estado`. `nombreCompleto` puede llegar como
 * " " porque el backend concatena dos campos anulables.
 */
function aLegajoResumenUsuario(usuario: LegajoResumenUsuario): LegajoResumenUsuario {
  return {
    idUsuario: usuario.idUsuario,
    nombreCompleto: usuario.nombreCompleto?.trim() || 'Persona sin nombre cargado',
    dni: usuario.dni ?? '',
    documentos: (usuario.documentos ?? []).map((documento) => ({
      idLegajo: documento.idLegajo,
      idTipoDoc: documento.idTipoDoc ?? null,
      estado: documento.estado,
      rutaArchivo: documento.rutaArchivo,
    })),
  };
}

/**
 * Normaliza una fila de `resumen-usuarios`, igual criterio que
 * `aLegajoResumenUsuario`: `nombreCompleto` puede llegar vacío.
 */
function aResumenUsuarioLegajo(usuario: ResumenUsuarioLegajo): ResumenUsuarioLegajo {
  return {
    idUsuario: usuario.idUsuario,
    nombreCompleto: usuario.nombreCompleto?.trim() || 'Persona sin nombre cargado',
    dni: usuario.dni ?? '',
    aprobados: usuario.aprobados ?? 0,
    pendientes: usuario.pendientes ?? 0,
    rechazados: usuario.rechazados ?? 0,
    otros: usuario.otros ?? 0,
    total: usuario.total ?? 0,
  };
}
