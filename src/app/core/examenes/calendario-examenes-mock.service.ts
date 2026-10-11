import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { aFechaSola } from '../comun/fechas';
import { EstadoMesApi, aCalendarioDelMes } from './adaptador-estado-mes';
import { CalendarioExamenesService, MENSAJE_ERROR_CALENDARIO } from './calendario-examenes.service';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MesaAsignada } from './modelos/mesa-asignada';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/** El valor por defecto del backend cuando nunca se configuró. */
const LIMITE_POR_DEFECTO = 2;

/** Un parcial de ejemplo: el día del mes en que cae y de qué es. */
interface EjemploDeParcial {
  dia: number;
  materia: string;
  comision: string;
  tipo: string;
}

/** Los parciales de ejemplo de cualquier mes. */
const EJEMPLOS: readonly EjemploDeParcial[] = [
  { dia: 5, materia: 'Introducción a Sistemas', comision: 'Comisión 1° A', tipo: 'Parcial' },
  { dia: 12, materia: 'Matemática', comision: 'Comisión 1° A', tipo: 'Parcial' },
  { dia: 12, materia: 'Didáctica General', comision: 'Comisión 2° A', tipo: 'Parcial' },
  { dia: 21, materia: 'Pedagogía', comision: 'Comisión 2° A', tipo: 'Parcial' },
];

/** Un mes fuera de 1 a 12 falla: es el 500 del backend. */
function esMesValido(mes: number): boolean {
  return Number.isInteger(mes) && mes >= 1 && mes <= 12;
}

/**
 * El calendario de parciales, en memoria.
 *
 * No se usa: `app.config.ts` provee `CalendarioExamenesHttpService`. Queda para
 * seguir trabajando en la pantalla con el backend caído, cambiando una línea.
 *
 * Respeta el contrato del backend: arma una respuesta de `estado-mes` con solo
 * los días que tienen parciales, a medianoche, y la pasa por el mismo adaptador
 * que la API real. Un mes fuera de 1 a 12 falla, como el 500 del backend. El
 * límite arranca en 2 y rechaza 0 o menos con el mismo mensaje; el que se guarda
 * también rige para el calendario.
 *
 * A diferencia de la API real, acá SÍ hay un listado de parciales
 * (`examenesDelMes`), con los mismos días que cuenta `calendarioDelMes`.
 *
 * Las mesas asignadas caen siempre en el futuro (una y dos semanas desde hoy):
 * así la campana de un docente las muestra sin importar cuándo se use el mock.
 */
@Injectable()
export class CalendarioExamenesMockService extends CalendarioExamenesService {
  private limite = LIMITE_POR_DEFECTO;

  calendarioDelMes(anio: number, mes: number): Observable<CalendarioDelMes> {
    if (!esMesValido(mes)) {
      return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
    }

    const cantidadPorDia = new Map<number, number>();
    for (const { dia } of EJEMPLOS) {
      cantidadPorDia.set(dia, (cantidadPorDia.get(dia) ?? 0) + 1);
    }

    const respuesta: EstadoMesApi = {
      limiteDiario: this.limite,
      diasOcupados: Array.from(cantidadPorDia, ([dia, cantidadExamenes]) => ({
        fecha: `${aFechaSola(new Date(anio, mes - 1, dia))}T00:00:00`,
        cantidadExamenes,
        limiteAlcanzado: cantidadExamenes >= this.limite,
      })),
    };
    return of(aCalendarioDelMes(respuesta, { anio, mes })).pipe(delay(DEMORA_SIMULADA_MS));
  }

  examenesDelMes(anio: number, mes: number): Observable<ExamenCalendario[]> {
    if (!esMesValido(mes)) {
      return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
    }

    const examenes = EJEMPLOS.map(({ dia, ...datos }, indice): ExamenCalendario => ({
      idExamen: indice + 1,
      fecha: aFechaSola(new Date(anio, mes - 1, dia)),
      ...datos,
    }));
    return of(examenes).pipe(delay(DEMORA_SIMULADA_MS));
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
