import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { RUTAS_API } from '../configuracion/api';
import {
  JustificativoPendiente,
  NuevoJustificativo,
} from './modelos/justificativo-pendiente';
import {
  JustificativosService,
  MENSAJE_ERROR_AUDITORIA,
  MENSAJE_ERROR_CARGA,
  MENSAJE_ERROR_JUSTIFICATIVOS,
  VeredictoAuditoria,
} from './justificativos.service';

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

/** Justificativos contra la API real. Los tres endpoints existen y andan. */
@Injectable()
export class JustificativosHttpService extends JustificativosService {
  private readonly http = inject(HttpClient);

  listarPendientes(): Observable<JustificativoPendiente[]> {
    return this.http.get<JustificativoApi[]>(RUTAS_API.justificativosPendientes).pipe(
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

  cargar(justificativo: NuevoJustificativo): Observable<void> {
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
    return this.http.post(RUTAS_API.cargarJustificativo, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al cargar el justificativo:', error);
        return throwError(() => new Error(MENSAJE_ERROR_CARGA));
      }),
    );
  }
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
