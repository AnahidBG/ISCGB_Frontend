import { aFechaSola, desdeFechaSola } from '../comun/fechas';
import { MesCalendario } from './calendario-mes';
import { estadoDelDia } from './estado-del-dia';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { DiaCalendario } from './modelos/dia-calendario';

/**
 * Un elemento de `diasOcupados`. La fecha es un `DateTime` de .NET:
 * "2026-10-13T00:00:00".
 *
 * Los tipos crudos de la API viven acá y solo los conoce el servicio HTTP: nada
 * de `core/examenes/` para afuera ve esta forma, siempre `DiaCalendario`.
 */
export interface DiaOcupadoApi {
  fecha: string;
  cantidadExamenes: number;
  /** No se usa: el estado sale de `estadoDelDia(cantidad, limite)`. */
  limiteAlcanzado: boolean;
}

/** El cuerpo del `GET .../estado-mes`. */
export interface EstadoMesApi {
  limiteDiario: number;
  diasOcupados: DiaOcupadoApi[];
}

/** Un conteo legible: un entero de 0 para arriba. */
function esCantidadLegible(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;
}

/**
 * Lee un elemento de `diasOcupados` y devuelve `[fecha, cantidad]`, o `null` si
 * no se puede leer (no es un objeto, la fecha no es una fecha o la cantidad no
 * es un número válido).
 */
function leerDiaOcupado(entrada: unknown): [string, number] | null {
  if (typeof entrada !== 'object' || entrada === null) {
    return null;
  }
  const { fecha, cantidadExamenes } = entrada as Partial<Record<keyof DiaOcupadoApi, unknown>>;

  // `desdeFechaSola` y no `new Date(texto)`: una fecha sin zona se leería en UTC
  // y en Argentina caería el día anterior.
  const fechaLocal = typeof fecha === 'string' ? desdeFechaSola(fecha) : null;
  if (fechaLocal === null || !esCantidadLegible(cantidadExamenes)) {
    return null;
  }
  return [aFechaSola(fechaLocal), cantidadExamenes];
}

/**
 * Adapter: la respuesta cruda de `estado-mes` → el modelo del calendario.
 *
 * Devuelve TODOS los días del mes pedido, en orden: el backend solo lista los
 * que tienen parciales, y los demás quedan con cantidad 0.
 *
 * Es tolerante con cada día y estricto con el conjunto. Un elemento de
 * `diasOcupados` que no se puede leer se descarta y ese día queda disponible: un
 * dato roto no tiene que tirar abajo el mes. En cambio, si la respuesta entera
 * no se puede leer (no es un objeto, no trae un límite numérico o los días no
 * son una lista) falla: un calendario con datos inventados es peor que ninguno.
 *
 * Un día que no pertenece al mes pedido tampoco entra: no tiene dónde dibujarse.
 */
export function aCalendarioDelMes(respuesta: unknown, mes: MesCalendario): CalendarioDelMes {
  if (typeof respuesta !== 'object' || respuesta === null) {
    throw new Error('La respuesta del calendario no se puede leer.');
  }

  const { limiteDiario, diasOcupados } = respuesta as Partial<Record<keyof EstadoMesApi, unknown>>;
  if (typeof limiteDiario !== 'number' || !Number.isFinite(limiteDiario)) {
    throw new Error('La respuesta no trae `limiteDiario`.');
  }
  if (!Array.isArray(diasOcupados)) {
    throw new Error('La respuesta no trae `diasOcupados`.');
  }

  const cantidadPorFecha = new Map<string, number>();
  for (const entrada of diasOcupados) {
    const dia = leerDiaOcupado(entrada);
    if (dia !== null) {
      cantidadPorFecha.set(dia[0], dia[1]);
    }
  }

  // `Date` normaliza el día 0 al último del mes anterior: es el largo del mes.
  const diasDelMes = new Date(mes.anio, mes.mes, 0).getDate();
  const dias = Array.from({ length: diasDelMes }, (_, posicion): DiaCalendario => {
    const fecha = aFechaSola(new Date(mes.anio, mes.mes - 1, posicion + 1));
    const cantidad = cantidadPorFecha.get(fecha) ?? 0;
    return { fecha, cantidad, limite: limiteDiario, estado: estadoDelDia(cantidad, limiteDiario) };
  });

  return { limite: limiteDiario, dias };
}
