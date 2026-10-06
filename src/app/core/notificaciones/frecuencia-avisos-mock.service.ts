import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { FrecuenciaAvisosService } from './frecuencia-avisos.service';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/** El valor por defecto del backend cuando nunca se configuró. */
const DIAS_POR_DEFECTO = 7;

/**
 * La frecuencia de los avisos, en memoria.
 *
 * No se usa: `app.config.ts` provee `FrecuenciaAvisosHttpService`. Queda para
 * seguir trabajando en la pantalla con el backend caído, cambiando una línea.
 *
 * Respeta el contrato del backend: arranca en 7 y rechaza 0 o menos con el
 * mismo mensaje, así la pantalla no nota la diferencia.
 */
@Injectable()
export class FrecuenciaAvisosMockService extends FrecuenciaAvisosService {
  private dias = DIAS_POR_DEFECTO;

  obtener(): Observable<number> {
    return of(this.dias).pipe(delay(DEMORA_SIMULADA_MS));
  }

  guardar(dias: number): Observable<void> {
    if (dias <= 0) {
      return throwError(() => new Error('La frecuencia debe ser mayor a 0 días.'));
    }
    this.dias = dias;
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
