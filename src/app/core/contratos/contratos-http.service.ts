import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { traducirRechazo } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import {
  ContratosService,
  MENSAJE_ERROR_CARGAR_CONTRATO,
  MENSAJE_ERROR_DESCARGAR_CONTRATO,
  MENSAJE_ERROR_LISTAR_CONTRATOS,
} from './contratos.service';
import { ContratoAlumno, NuevoContrato } from './modelos/contrato-alumno';

/** Un elemento de los dos `GET` de listas. */
interface ContratoAlumnoApi {
  idContrato: number;
  nombre: string;
  /** Un `DateTime` de .NET, con hora y sin zona: "2026-03-12T09:30:00". */
  fechaCarga: string;
}

/** Lo que devuelve el `POST` en un 200. */
interface RespuestaApi {
  message?: string;
}

/** Una fecha CON hora: "2026-03-12T09:30:00". */
const TEXTO_FECHA_Y_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Los contratos contra la API. Sigue el contrato que propuso el frontend: el
 * backend todavía no lo publicó y `app.config.ts` provee el mock.
 */
@Injectable()
export class ContratosHttpService extends ContratosService {
  private readonly http = inject(HttpClient);

  cargar(contrato: NuevoContrato): Observable<string> {
    const cuerpo = new FormData();
    cuerpo.append('idUsuario', String(contrato.idUsuario));
    cuerpo.append('nombre', contrato.nombre);
    cuerpo.append('archivo', contrato.archivo);

    return this.http.post<RespuestaApi>(RUTAS_API.cargarContratoAlumno, cuerpo).pipe(
      map((respuesta) => respuesta?.message?.trim() || 'Contrato cargado.'),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(error, MENSAJE_ERROR_CARGAR_CONTRATO, 'Error al cargar el contrato:'),
            ),
        ),
      ),
    );
  }

  listarDeAlumno(idUsuario: number): Observable<ContratoAlumno[]> {
    return this.listar(RUTAS_API.contratosDeAlumno(idUsuario));
  }

  misContratos(): Observable<ContratoAlumno[]> {
    return this.listar(RUTAS_API.misContratos);
  }

  descargar(idContrato: number): Observable<Blob> {
    return this.http.get(RUTAS_API.pdfContratoAlumno(idContrato), { responseType: 'blob' }).pipe(
      catchError((error: unknown) => {
        console.error('Error al descargar el contrato:', error);
        return throwError(() => new Error(MENSAJE_ERROR_DESCARGAR_CONTRATO));
      }),
    );
  }

  private listar(url: string): Observable<ContratoAlumno[]> {
    return this.http.get<unknown>(url).pipe(
      map(aContratos),
      catchError((error: unknown) => {
        console.error('Error al traer los contratos:', error);
        return throwError(() => new Error(MENSAJE_ERROR_LISTAR_CONTRATOS));
      }),
    );
  }
}

/** Un id legible: un entero positivo. */
function esId(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

/**
 * Adapter: la respuesta cruda → los contratos, del más nuevo al más viejo.
 * Tolerante con cada contrato (uno que no se puede leer se descarta) y estricto
 * con el conjunto (si no es una lista, falla).
 */
function aContratos(respuesta: unknown): ContratoAlumno[] {
  if (!Array.isArray(respuesta)) {
    throw new Error('La respuesta no es una lista de contratos.');
  }
  return respuesta
    .map(aContrato)
    .filter((contrato): contrato is ContratoAlumno => contrato !== null)
    .sort((a, b) => b.fechaCarga.getTime() - a.fechaCarga.getTime());
}

function aContrato(entrada: unknown): ContratoAlumno | null {
  const contrato = (entrada ?? {}) as Partial<Record<keyof ContratoAlumnoApi, unknown>>;

  // Sin zona y con hora, `new Date` la lee en hora local: la del instituto.
  const fecha =
    typeof contrato.fechaCarga === 'string' && TEXTO_FECHA_Y_HORA.test(contrato.fechaCarga)
      ? new Date(contrato.fechaCarga)
      : null;
  if (!esId(contrato.idContrato) || fecha === null || Number.isNaN(fecha.getTime())) {
    return null;
  }

  return {
    idContrato: contrato.idContrato,
    nombre: (typeof contrato.nombre === 'string' ? contrato.nombre.trim() : '') || 'Contrato',
    fechaCarga: fecha,
  };
}
