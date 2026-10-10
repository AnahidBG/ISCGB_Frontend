import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { ExamenesService, MENSAJE_ERROR_CALENDARIO } from './examenes.service';
import { EstadoMes } from './modelos/estado-mes';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/** El valor por defecto del backend cuando nunca se configuró. */
const LIMITE_DIARIO = 2;

/** Cuántos exámenes tiene cada día del mes (el resto está libre). Igual en todos los meses. */
const EXAMENES_POR_DIA: Readonly<Record<number, number>> = { 5: 1, 12: 2, 21: 1 };

/**
 * El calendario de exámenes, en memoria.
 *
 * No se usa: `app.config.ts` provee `ExamenesHttpService`. Queda para seguir
 * trabajando en la pantalla con el backend caído, cambiando una línea.
 *
 * Respeta el contrato del backend: devuelve solo los días con exámenes, a
 * medianoche, y marca el límite alcanzado como lo hace él. Un mes fuera de 1 a
 * 12 falla, como el 500 del backend.
 */
@Injectable()
export class ExamenesMockService extends ExamenesService {
  estadoDelMes(anio: number, mes: number): Observable<EstadoMes> {
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
    }

    const estado: EstadoMes = {
      limiteDiario: LIMITE_DIARIO,
      diasOcupados: Object.entries(EXAMENES_POR_DIA).map(([dia, cantidadExamenes]) => ({
        fecha: new Date(anio, mes - 1, Number(dia)),
        cantidadExamenes,
        limiteAlcanzado: cantidadExamenes >= LIMITE_DIARIO,
      })),
    };
    return of(estado).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
