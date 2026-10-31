import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { traducirRechazo } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import { textoFechaYHora } from '../examenes/registro-examen';
import { NuevaSuplencia, ResultadoSuplencia } from './modelos/suplencia';
import { MENSAJE_ERROR_SUPLENCIA, SuplenciasService } from './suplencias.service';

/** El cuerpo del `PUT .../suplencia` (`GestionarSuplenciaDto`). */
interface GestionarSuplenciaApi {
  esSuplente: boolean;
  /** Un `DateTime` de .NET sin zona: "2026-11-02T00:00:00". `null` = hoy. */
  fechaInicio: string | null;
  fechaFin: string | null;
}

/** Lo que devuelve el `PUT` en un 200. */
interface ResultadoSuplenciaApi {
  message?: string;
  esSuplente?: boolean;
  estadoUsuario?: boolean;
}

/** Las suplencias contra la API real. */
@Injectable()
export class SuplenciasHttpService extends SuplenciasService {
  private readonly http = inject(HttpClient);

  asignar(suplencia: NuevaSuplencia): Observable<ResultadoSuplencia> {
    // Adapter de salida: nunca `toISOString()`, que pasaría el día a UTC.
    return this.enviar(suplencia.idDocente, {
      esSuplente: true,
      fechaInicio: textoFechaYHora(suplencia.desde, '00:00'),
      fechaFin: suplencia.hasta === null ? null : textoFechaYHora(suplencia.hasta, '00:00'),
    });
  }

  darDeBaja(idDocente: number): Observable<ResultadoSuplencia> {
    return this.enviar(idDocente, { esSuplente: false, fechaInicio: null, fechaFin: null });
  }

  private enviar(idDocente: number, cuerpo: GestionarSuplenciaApi): Observable<ResultadoSuplencia> {
    return this.http.put<ResultadoSuplenciaApi>(RUTAS_API.suplenciaDocente(idDocente), cuerpo).pipe(
      // Si la respuesta no trae los datos, se da por hecho lo que se pidió y
      // que la cuenta sigue activa: es lo que pasa en casi todos los casos.
      map((respuesta) => ({
        esSuplente:
          typeof respuesta?.esSuplente === 'boolean' ? respuesta.esSuplente : cuerpo.esSuplente,
        cuentaActiva: respuesta?.estadoUsuario !== false,
      })),
      catchError((error: HttpErrorResponse) =>
        throwError(
          () =>
            new Error(
              traducirRechazo(error, MENSAJE_ERROR_SUPLENCIA, 'Error al guardar la suplencia:'),
            ),
        ),
      ),
    );
  }
}
