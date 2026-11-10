import { aFechaSola, desdeFechaSola } from '../comun/fechas';
import { MesCalendario } from './calendario-mes';
import { estadoDelDia } from './estado-del-dia';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { DiaCalendario, EstadoDiaCalendario } from './modelos/dia-calendario';

/**
 * Un elemento de `diasOcupados`. La fecha es un `DateTime` de .NET:
 * "2026-10-13T00:00:00".
 *
 * Los tipos crudos de la API viven acá y solo los conoce el servicio HTTP: nada
 * de `core/examenes/` para afuera ve esta forma, siempre `DiaCalendario`.
 */
export interface DiaOcupadoApi {
  fecha: string;
  /** Los exámenes del día: de todos los grupos, o del grupo pedido. */
  cantidadExamenes: number;
  /**
   * Si el día no tiene lugar. Desde el 10/11/2026 el límite es por año y comisión:
   * sin grupo, es `true` si ALGÚN grupo llegó; con grupo, si llegó ese. Por eso el
   * estado sale de acá y no de `cantidadExamenes >= limiteDiario`, que con varios
   * grupos marcaría lleno un día con lugar.
   */
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

/** Un día de `diasOcupados` ya leído. `lleno` es `null` si el backend no lo mandó. */
interface DiaLeido {
  fecha: string;
  cantidad: number;
  lleno: boolean | null;
}

/**
 * Lee un elemento de `diasOcupados`, o devuelve `null` si no se puede leer (no
 * es un objeto, la fecha no es una fecha o la cantidad no es un número válido).
 */
function leerDiaOcupado(entrada: unknown): DiaLeido | null {
  if (typeof entrada !== 'object' || entrada === null) {
    return null;
  }
  const { fecha, cantidadExamenes, limiteAlcanzado } = entrada as Partial<
    Record<keyof DiaOcupadoApi, unknown>
  >;

  // `desdeFechaSola` y no `new Date(texto)`: una fecha sin zona se leería en UTC
  // y en Argentina caería el día anterior.
  const fechaLocal = typeof fecha === 'string' ? desdeFechaSola(fecha) : null;
  if (fechaLocal === null || !esCantidadLegible(cantidadExamenes)) {
    return null;
  }
  return {
    fecha: aFechaSola(fechaLocal),
    cantidad: cantidadExamenes,
    lleno: typeof limiteAlcanzado === 'boolean' ? limiteAlcanzado : null,
  };
}

/**
 * El estado del día. Manda `limiteAlcanzado` del backend, que sabe de años y
 * comisiones. Si no vino (un backend anterior al 10/11/2026, cuando el límite
 * era para todo el día), se calcula con la cantidad y el límite.
 */
function estadoSegunBackend(dia: DiaLeido | undefined, limite: number): EstadoDiaCalendario {
  if (dia === undefined || dia.cantidad === 0) {
    return 'disponible';
  }
  if (dia.lleno === null) {
    return estadoDelDia(dia.cantidad, limite);
  }
  return dia.lleno ? 'completo' : 'ocupado';
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

  const porFecha = new Map<string, DiaLeido>();
  for (const entrada of diasOcupados) {
    const dia = leerDiaOcupado(entrada);
    if (dia !== null) {
      porFecha.set(dia.fecha, dia);
    }
  }

  // `Date` normaliza el día 0 al último del mes anterior: es el largo del mes.
  const diasDelMes = new Date(mes.anio, mes.mes, 0).getDate();
  const dias = Array.from({ length: diasDelMes }, (_, posicion): DiaCalendario => {
    const fecha = aFechaSola(new Date(mes.anio, mes.mes - 1, posicion + 1));
    const dia = porFecha.get(fecha);
    return {
      fecha,
      cantidad: dia?.cantidad ?? 0,
      limite: limiteDiario,
      estado: estadoSegunBackend(dia, limiteDiario),
    };
  });

  return { limite: limiteDiario, dias };
}
