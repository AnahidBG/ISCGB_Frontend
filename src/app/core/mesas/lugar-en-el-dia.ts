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
 * cuenta para el límite del día. `calendario` tiene que ser el del año y la
 * comisión de la mesa (`calendarioDelMes` con grupo): desde el 10/11/2026 el
 * límite es por grupo. `registrar-mesa` también lo valida desde ese día; esto
 * avisa antes de mandarla. Un día que el calendario no lista no tiene exámenes:
 * entra.
 */
export function motivoSinLugar(calendario: CalendarioDelMes, dia: string): string | null {
  const delDia = calendario.dias.find((otro) => otro.fecha === dia);
  if (delDia?.estado !== 'completo') {
    return null;
  }
  return (
    `Ese año y comisión ya tienen ese día el límite de ${textoDeParciales(calendario.limite)} ` +
    `por ${PERIODO_DEL_LIMITE}, y las mesas de examen también cuentan. Elegí otra fecha.`
  );
}
