import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { esEndpointInexistente, mensajeDelServidor } from '../comun/error-api';
import { RUTAS_API } from '../configuracion/api';
import {
  FrecuenciaAvisosService,
  MENSAJE_ERROR_FRECUENCIA,
  MENSAJE_ERROR_GUARDAR_FRECUENCIA,
} from './frecuencia-avisos.service';

/** El cuerpo del GET y del PUT (`ConfiguracionNotificacionDto`). */
interface FrecuenciaApi {
  diasFrecuencia: number;
}

/** La frecuencia de los avisos contra la API real. */
@Injectable()
export class FrecuenciaAvisosHttpService extends FrecuenciaAvisosService {
  private readonly http = inject(HttpClient);

  obtener(): Observable<number> {
    return this.http.get<FrecuenciaApi | null>(RUTAS_API.frecuenciaNotificaciones).pipe(
      map(aDias),
      catchError((error: unknown) => {
        console.error('Error al traer la frecuencia de los avisos:', error);
        return throwError(() => new Error(MENSAJE_ERROR_FRECUENCIA));
      }),
    );
  }

  guardar(dias: number): Observable<void> {
    const cuerpo: FrecuenciaApi = { diasFrecuencia: dias };

    return this.http.put(RUTAS_API.frecuenciaNotificaciones, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => throwError(() => new Error(traducirError(error)))),
    );
  }
}

/** Adapter: la respuesta cruda → los días. Sin un número no hay nada que mostrar. */
function aDias(respuesta: FrecuenciaApi | null): number {
  const dias: unknown = respuesta?.diasFrecuencia;
  if (typeof dias !== 'number' || !Number.isFinite(dias)) {
    throw new Error('La respuesta no trae `diasFrecuencia`.');
  }
  return dias;
}

/**
 * El mensaje que ve la persona si el guardado falla.
 *
 * El del backend primero, pero solo si es un rechazo del valor (4xx): ahí
 * explica qué corregir ("La frecuencia debe ser mayor a 0 días."). Un 5xx o
 * una ruta que no existe no le dicen nada útil a quien está en la pantalla.
 */
function traducirError(error: HttpErrorResponse): string {
  const delServidor = mensajeDelServidor(error);
  const esRechazoDelValor =
    error.status >= 400 && error.status < 500 && !esEndpointInexistente(error);

  if (delServidor !== null && esRechazoDelValor) {
    return delServidor;
  }
  console.error('Error al guardar la frecuencia de los avisos:', error);
  return MENSAJE_ERROR_GUARDAR_FRECUENCIA;
}
