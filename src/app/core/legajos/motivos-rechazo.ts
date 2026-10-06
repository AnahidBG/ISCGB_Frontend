/**
 * Los motivos por los que el instituto no acepta un documento del legajo
 * (regla de negocio #4: "las opciones estándar de la institución").
 *
 * Es la ÚNICA fuente de estos textos: los templates los recorren desde acá y
 * no los repiten. Los textos y el orden son los de la lista oficial que pasó
 * el instituto; si cambian, se cambian acá.
 */
export const MOTIVOS_RECHAZO = [
  'Dato de importancia ilegible',
  'El escaneo no permite distinguir información importante',
  'Falta información imprescindible',
  'Falta sello y/o firma',
  'Documento incompleto',
  'No se encuentra en formato pdf',
  'No corresponde a lo solicitado',
] as const;

export type MotivoRechazo = (typeof MOTIVOS_RECHAZO)[number];

/**
 * Arma el `comentario` que viaja en el PUT de auditoría a partir de los
 * motivos elegidos y una aclaración opcional:
 *
 *   "Falta sello y/o firma; Documento incompleto. Aclaración: falta la hoja 2"
 *
 * Los motivos salen en el orden de la lista oficial, no en el que se
 * marcaron: dos rechazos con los mismos motivos se leen igual. La aclaración
 * se recorta y se pasa a una sola línea; vacía o con solo espacios, no se
 * agrega.
 *
 * Sin ningún motivo no hay rechazo válido (regla #4) y devuelve `''`, aunque
 * haya aclaración. La pantalla no deja llegar a ese caso.
 */
export function comentarioDeRechazo(
  motivos: readonly MotivoRechazo[],
  aclaracion = '',
): string {
  const lista = MOTIVOS_RECHAZO.filter((motivo) => motivos.includes(motivo)).join('; ');
  if (lista === '') {
    return '';
  }

  const detalle = aclaracion.replace(/\s+/g, ' ').trim();
  return detalle === '' ? lista : `${lista}. Aclaración: ${detalle}`;
}
