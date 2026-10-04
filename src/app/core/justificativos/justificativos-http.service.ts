import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { contextoDePedido } from '../carga/contexto-pedido';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { RUTAS_API } from '../configuracion/api';
import {
  JustificativoPendiente,
  NuevoJustificativo,
} from './modelos/justificativo-pendiente';
import { JustificativoPropio } from './modelos/justificativo-propio';
import {
  JustificativosService,
  MENSAJE_CARGA_POR_DEFECTO,
  MENSAJE_ERROR_AUDITORIA,
  MENSAJE_ERROR_CARGA,
  MENSAJE_ERROR_JUSTIFICATIVOS,
  MENSAJE_ERROR_MIS_JUSTIFICATIVOS,
  VeredictoAuditoria,
} from './justificativos.service';

/** Lo único que devuelve `POST /api/Justificativos/cargar` en un 200. */
interface RespuestaCargaApi {
  message?: string;
}

/**
 * Forma cruda de `GET /api/Justificativos/pendientes`.
 *
 * Las fechas llegan como texto ISO, no como `Date`: JSON no tiene tipo fecha.
 * Por eso este tipo intermedio existe — para no mentirle al resto del
 * frontend diciendo que ya son `Date` cuando todavía son `string`.
 */
interface JustificativoApi {
  idJustificativo: number;
  nombreDocente: string;
  tipoInasistencia: string;
  rutaArchivo: string | null;
  fechaCarga: string;
}

/** Cada fila de `GET /api/Justificativos/{idUsuario}/justificativos` (`JustificativoResponseDto`). */
interface JustificativoPropioApi {
  idJustificativo: number;
  tipoInasistencia: string | null;
  rutaArchivo: string | null;
  notaAdicional: string | null;
  fechaCarga: string;
  estado: string | null;
  fechaInasistenciaInicio: string | null;
  fechaInasistenciaFin: string | null;
  idUsuarioAuditor: number | null;
}

/**
 * Lo que envuelve a esa lista. Sin justificativos manda además un `message`
 * ("El usuario no tiene justificativos presentados."); no es un error.
 */
interface JustificativosDeUsuarioApi {
  nombreUsuario?: string;
  message?: string;
  data?: JustificativoPropioApi[];
}

/** Justificativos contra la API real. */
@Injectable()
export class JustificativosHttpService extends JustificativosService {
  private readonly http = inject(HttpClient);

  listarPendientes(opciones?: OpcionesPedido): Observable<JustificativoPendiente[]> {
    const url = RUTAS_API.justificativosPendientes;
    return this.http.get<JustificativoApi[]>(url, { context: contextoDePedido(opciones) }).pipe(
      // Este endpoint devuelve `[]` cuando no hay ninguno, NO 404 — al revés
      // que los de Legajos y Usuarios. Por eso acá no hay un catch de 404.
      map((justificativos) => justificativos.map(aJustificativoPendiente)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer justificativos pendientes:', error);
        return throwError(() => new Error(MENSAJE_ERROR_JUSTIFICATIVOS));
      }),
    );
  }

  auditar(
    idJustificativo: number,
    veredicto: VeredictoAuditoria,
    idUsuarioAuditor: number,
  ): Observable<void> {
    return this.http
      .put(RUTAS_API.auditarJustificativo(idJustificativo), {
        idUsuarioAuditor,
        estado: veredicto,
      })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) => {
          console.error('Error al auditar el justificativo:', error);
          return throwError(() => new Error(MENSAJE_ERROR_AUDITORIA));
        }),
      );
  }

  cargar(justificativo: NuevoJustificativo): Observable<string> {
    const cuerpo = new FormData();

    // Los nombres tienen que coincidir con las propiedades de
    // `CargarJustificativoDto`. ASP.NET no distingue mayúsculas al enlazar
    // el formulario, así que `idUsuario` entra bien en `IdUsuario`.
    cuerpo.append('idUsuario', String(justificativo.idUsuario));
    cuerpo.append('tipoInasistencia', justificativo.tipoInasistencia);

    if (justificativo.notaAdicional !== null) {
      cuerpo.append('notaAdicional', justificativo.notaAdicional);
    }
    if (justificativo.fechaInasistenciaInicio !== null) {
      cuerpo.append(
        'fechaInasistenciaInicio',
        justificativo.fechaInasistenciaInicio.toISOString(),
      );
    }
    if (justificativo.fechaInasistenciaFin !== null) {
      cuerpo.append('fechaInasistenciaFin', justificativo.fechaInasistenciaFin.toISOString());
    }
    if (justificativo.documentoPdf !== null) {
      cuerpo.append('documentoPdf', justificativo.documentoPdf);
    }

    // Sin `Content-Type` a propósito: el navegador lo pone solo, con el
    // `boundary` que necesita multipart. Ponerlo a mano rompe la subida.
    return this.http.post<RespuestaCargaApi>(RUTAS_API.cargarJustificativo, cuerpo).pipe(
      map((respuesta) => respuesta?.message?.trim() || MENSAJE_CARGA_POR_DEFECTO),
      catchError((error: HttpErrorResponse) => {
        // El 400 del backend explica qué corregir, así que es mejor que el nuestro.
        const motivo = typeof error.error?.message === 'string' ? error.error.message : null;
        console.error('Error al cargar el justificativo:', error);
        return throwError(() => new Error(motivo ?? MENSAJE_ERROR_CARGA));
      }),
    );
  }

  listarDeUsuario(idUsuario: number): Observable<JustificativoPropio[]> {
    const url = RUTAS_API.justificativosDeUsuario(idUsuario);
    return this.http.get<JustificativosDeUsuarioApi>(url).pipe(
      map((respuesta) => (respuesta?.data ?? []).map(aJustificativoPropio)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al traer los justificativos de la persona:', error);
        return throwError(() => new Error(MENSAJE_ERROR_MIS_JUSTIFICATIVOS));
      }),
    );
  }
}

function fechaOpcional(texto: string | null): Date | null {
  return texto === null ? null : new Date(texto);
}

function aJustificativoPropio(justificativo: JustificativoPropioApi): JustificativoPropio {
  const nota = justificativo.notaAdicional?.trim() ?? '';
  return {
    idJustificativo: justificativo.idJustificativo,
    tipoInasistencia: justificativo.tipoInasistencia?.trim() || 'Sin motivo cargado',
    rutaArchivo: justificativo.rutaArchivo,
    notaAdicional: nota === '' ? null : nota,
    fechaCarga: new Date(justificativo.fechaCarga),
    estado: justificativo.estado,
    fechaInicio: fechaOpcional(justificativo.fechaInasistenciaInicio),
    fechaFin: fechaOpcional(justificativo.fechaInasistenciaFin),
    revisado: justificativo.idUsuarioAuditor !== null,
  };
}

function aJustificativoPendiente(justificativo: JustificativoApi): JustificativoPendiente {
  return {
    idJustificativo: justificativo.idJustificativo,
    nombreDocente: justificativo.nombreDocente.trim(),
    tipoInasistencia: justificativo.tipoInasistencia,
    rutaArchivo: justificativo.rutaArchivo,
    fechaCarga: new Date(justificativo.fechaCarga),
  };
}
