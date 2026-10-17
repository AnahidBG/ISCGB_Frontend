import { aFechaSola, desdeFechaSola } from '../comun/fechas';
import { MesCalendario } from './calendario-mes';
import { ExamenCalendario } from './modelos/examen-calendario';

/**
 * Un elemento del `GET .../del-mes` (`ExamenMesDto`). La fecha es un `DateTime`
 * de .NET, con hora y sin zona: "2026-10-20T09:00:00".
 *
 * Los tipos crudos de la API viven acá y solo los conoce el servicio HTTP: nada
 * de `core/examenes/` para afuera ve esta forma, siempre `ExamenCalendario`.
 */
export interface ExamenMesApi {
  idExamen: number;
  materia: string;
  fecha: string;
  comision: string;
  tipoExamen: string;
}

/** "2026-10-20T09:00:00" → el día y el horario. Sin hora no hay examen: no se inventa una. */
const FECHA_Y_HORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;

/** Un id legible: un entero positivo. */
function esId(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0;
}

/** El texto sin espacios de los costados, o el de reserva si no hay ninguno. */
function textoO(valor: unknown, reserva: string): string {
  return (typeof valor === 'string' ? valor.trim() : '') || reserva;
}

/** Lee un examen, o devuelve `null` si no se puede (sin id, sin fecha o sin hora). */
function leerExamen(entrada: unknown): ExamenCalendario | null {
  if (typeof entrada !== 'object' || entrada === null) {
    return null;
  }
  const examen = entrada as Partial<Record<keyof ExamenMesApi, unknown>>;

  const coincidencia = typeof examen.fecha === 'string' ? FECHA_Y_HORA.exec(examen.fecha) : null;
  // `desdeFechaSola` y no `new Date(texto)`: valida el día sin pasarlo por UTC.
  const dia = coincidencia === null ? null : desdeFechaSola(coincidencia[1]);
  if (!esId(examen.idExamen) || coincidencia === null || dia === null) {
    return null;
  }

  return {
    idExamen: examen.idExamen,
    fecha: aFechaSola(dia),
    horario: coincidencia[2],
    materia: textoO(examen.materia, 'Materia sin nombre'),
    comision: textoO(examen.comision, 'Sin comisión'),
    tipo: textoO(examen.tipoExamen, 'Examen'),
  };
}

/**
 * Adapter: la respuesta cruda de `del-mes` → los exámenes del calendario, en
 * orden de día y hora.
 *
 * Mismo criterio que `aCalendarioDelMes`: tolerante con cada examen y estricto
 * con el conjunto. Un examen que no se puede leer se descarta; una respuesta que
 * no es una lista falla. Un examen de otro mes tampoco entra: no tiene dónde
 * dibujarse.
 */
export function aExamenesDelMes(respuesta: unknown, mes: MesCalendario): ExamenCalendario[] {
  if (!Array.isArray(respuesta)) {
    throw new Error('La respuesta de los exámenes del mes no es una lista.');
  }

  const prefijo = aFechaSola(new Date(mes.anio, mes.mes - 1, 1)).slice(0, 8);
  return respuesta
    .map(leerExamen)
    .filter((examen): examen is ExamenCalendario => examen?.fecha.startsWith(prefijo) ?? false)
    .sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`));
}
