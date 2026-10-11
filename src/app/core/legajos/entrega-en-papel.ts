import { VeredictoLegajo } from './legajo.service';

/**
 * El veredicto que ya tiene un documento, o `null` si todavía nadie lo revisó.
 *
 * Decide dos cosas de la casilla "Presentado físicamente":
 *
 *   · Se guarda en el momento solo si hay veredicto. En un documento pendiente
 *     guardarla sola le asignaría un auditor a algo que nadie revisó: ahí
 *     viaja con el veredicto.
 *   · Cuando se guarda sola, hay que reenviar este mismo veredicto como
 *     `estado`, porque el backend lo reescribe en cada auditoría.
 */
export function veredictoGuardado(estado: string | null): VeredictoLegajo | null {
  return estado === 'Aprobado' || estado === 'Rechazado' ? estado : null;
}
