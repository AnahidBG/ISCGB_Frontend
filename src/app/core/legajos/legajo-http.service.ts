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

/** Cada fila de `documentos` dentro de lo que devuelve `GetLegajosPorUsuario`. */
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

/**
 * Forma REAL de `GET /api/Legajos/usuario/{id}` (`UsuarioDocumentosDto`).
 *
 * ⚠️ Bug real encontrado el 25/09/2026: el endpoint SIEMPRE envuelve los
 * documentos en este objeto — confirmado con `curl` contra el backend real,
 * para un usuario con documentos y para uno sin ninguno (`documentos: []`
 * en los dos casos, nunca un array suelto). El código de acá abajo pedía
 * `LegajoApi[]` directo y le hacía `.map()`, así que "Mi Legajo" y "Mis
 * Documentos" rompían con `TypeError: legajos.map is not a function` para
 * CUALQUIER usuario, siempre — quedaba tapado por el catchError genérico
 * ("No pudimos traer el legajo"), que se ve igual que un problema de red.
 */
interface UsuarioDocumentosApi {
  nombreCompleto: string | null;
  documentos: LegajoApi[] | null;
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
    return this.http.get<UsuarioDocumentosApi>(RUTAS_API.legajosPorUsuario(idUsuario)).pipe(
      map((respuesta) => (respuesta.documentos ?? []).map(aDocumentoLegajo)),
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
   *
   * ⚠️ PARCHE (Milena, 25/09/2026): `GET /api/Legajos/resumen-usuarios` NO
   * EXISTE en el backend — devuelve 404 de la propia infraestructura de
   * ASP.NET (ruta no mapeada, no un `NotFound()` a propósito del controller).
   * Confirmado leyendo `LegajoController.cs`: el endpoint nunca se
   * implementó del lado del backend, a pesar de que el frontend lo pide desde
   * la reestructuración de "Control de Legajos" del 01/09/2026.
   *
   * Efecto real: como `catchError` traduce CUALQUIER 404 en `[]` (para
   * distinguir "nadie tiene documentos" de un error), Secretaría veía la
   * lista de "Ver Legajos" completamente vacía — como si nadie hubiera
   * subido nada, aunque en la base sí estuvieran los documentos. Este era
   * el bug reportado: "subo un documento y me dice que se subió bien, pero
   * en Control de Legajos no aparece nada".
   *
   * Mientras el backend no agregue el endpoint liviano, uso acá el mismo
   * criterio que ya tenía `LegajoMockService.obtenerResumenUsuarios()`:
   * pido `GET /api/Legajos/resumen-estado` (que SÍ existe y trae a todos los
   * usuarios con su legajo completo) y calculo los conteos en el cliente.
   * Es más pesado que un endpoint agregado del lado del servidor, pero
   * funciona HOY sin esperar al equipo de backend. Cuando `resumen-usuarios`
   * exista de verdad, esta función vuelve a ser una sola llamada directa.
   */
  obtenerResumenUsuarios(): Observable<ResumenUsuarioLegajo[]> {
    // `obtenerResumenInstitucional()` ya traduce el 404 de "nadie tiene
    // documentos" a `[]` y cualquier otro error a un mensaje legible — no
    // hace falta un `catchError` más acá arriba.
    return this.obtenerResumenInstitucional().pipe(
      map((usuarios) => usuarios.map(aResumenUsuarioLegajoDesdeInstitucional)),
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
    presentadoFisico: legajo.presentadoFisico ?? false,
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
    presentadoFisico: pendiente.presentadoFisico ?? false,
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
 * Arma un `ResumenUsuarioLegajo` (conteos por estado) a partir de un
 * `LegajoResumenUsuario` (el legajo completo, documento por documento).
 *
 * Es el reemplazo de `GET /api/Legajos/resumen-usuarios` mientras ese
 * endpoint no exista en el backend — ver el comentario en
 * `obtenerResumenUsuarios()`. Mismo cálculo que ya usaba
 * `LegajoMockService.obtenerResumenUsuarios()`, para que el día que el
 * backend agregue el endpoint liviano los conteos den exactamente igual.
 */
function aResumenUsuarioLegajoDesdeInstitucional(
  usuario: LegajoResumenUsuario,
): ResumenUsuarioLegajo {
  const documentos = usuario.documentos ?? [];
  const aprobados = documentos.filter((d) => d.estado === 'Aprobado').length;
  const pendientes = documentos.filter((d) => d.estado === 'Pendiente').length;
  const rechazados = documentos.filter((d) => d.estado === 'Rechazado').length;
  const total = documentos.length;

  return {
    idUsuario: usuario.idUsuario,
    nombreCompleto: usuario.nombreCompleto,
    dni: usuario.dni,
    aprobados,
    pendientes,
    rechazados,
    otros: total - aprobados - pendientes - rechazados,
    total,
  };
}
