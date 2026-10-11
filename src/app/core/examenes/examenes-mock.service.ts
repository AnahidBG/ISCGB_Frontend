import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { ExamenesService, MENSAJE_ERROR_CALENDARIO } from './examenes.service';
import { EstadoMes } from './modelos/estado-mes';
import { MesaAsignada } from './modelos/mesa-asignada';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/** El valor por defecto del backend cuando nunca se configuró. */
const LIMITE_POR_DEFECTO = 2;

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
 * 12 falla, como el 500 del backend. El límite arranca en 2 y rechaza 0 o menos
 * con el mismo mensaje; el que se guarda también rige para el calendario.
 *
 * Las mesas asignadas caen siempre en el futuro (una y dos semanas desde hoy):
 * así la campana de un docente las muestra sin importar cuándo se use el mock.
 */
@Injectable()
export class ExamenesMockService extends ExamenesService {
  private limite = LIMITE_POR_DEFECTO;

  estadoDelMes(anio: number, mes: number): Observable<EstadoMes> {
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
    }

    const estado: EstadoMes = {
      limiteDiario: this.limite,
      diasOcupados: Object.entries(EXAMENES_POR_DIA).map(([dia, cantidadExamenes]) => ({
        fecha: new Date(anio, mes - 1, Number(dia)),
        cantidadExamenes,
        limiteAlcanzado: cantidadExamenes >= this.limite,
      })),
    };
    return of(estado).pipe(delay(DEMORA_SIMULADA_MS));
  }

  limiteDiario(): Observable<number> {
    return of(this.limite).pipe(delay(DEMORA_SIMULADA_MS));
  }

  guardarLimiteDiario(limite: number): Observable<void> {
    if (limite <= 0) {
      return throwError(() => new Error('El límite de parciales Diarios debe ser mayor a cero.'));
    }
    this.limite = limite;
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  mesasAsignadas(): Observable<MesaAsignada[]> {
    const hoy = new Date();
    const dentroDe = (dias: number, hora: number) =>
      new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, hora);

    const mesas: MesaAsignada[] = [
      { idExamen: 1, materia: 'Redes', fecha: dentroDe(7, 9) },
      { idExamen: 2, materia: 'Programación', fecha: dentroDe(14, 14) },
    ];
    return of(mesas).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
