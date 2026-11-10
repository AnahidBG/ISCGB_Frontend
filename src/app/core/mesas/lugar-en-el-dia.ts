import { textoDeParciales } from '../examenes/calendario-mes';
import { CalendarioDelMes } from '../examenes/modelos/calendario-del-mes';
import { PERIODO_DEL_LIMITE } from '../examenes/periodo-limite';

/** Cuando no se pudo revisar el calendario: la mesa no se manda a ciegas. */
export const MENSAJE_SIN_REVISAR_LUGAR =
  'No pudimos revisar si ese día tiene lugar en el calendario. Intentá de nuevo en un momento.';

/**
 * Por qué una mesa de examen no entra en su día, o `null` si entra.
 *
 * Las mesas se guardan en `Examenes`, igual que los parciales, y el backend las
 * cuenta para el límite del día (`estado-mes`). Pero `registrar-mesa` no lo
 * valida, así que el front no deja armarla en un día completo. Un día que el
 * calendario no lista no tiene exámenes: entra.
 */
export function motivoSinLugar(calendario: CalendarioDelMes, dia: string): string | null {
  const delDia = calendario.dias.find((otro) => otro.fecha === dia);
  if (delDia?.estado !== 'completo') {
    return null;
  }
  return (
    `Ese día ya alcanzó el límite de ${textoDeParciales(calendario.limite)} por ` +
    `${PERIODO_DEL_LIMITE}, y las mesas de examen también cuentan. Elegí otra fecha.`
  );
}
