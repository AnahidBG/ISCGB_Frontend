/**
 * Motivos de inasistencia para el desplegable de carga.
 *
 * OJO con `valor`: el backend compara `TipoInasistencia == "Causas Personales"`
 * para decidir si el PDF es opcional. Si no coincide exacto, exige el archivo.
 * Por eso el valor va separado de la etiqueta que se muestra.
 */
export interface TipoInasistencia {
  /** Lo que viaja al backend. Tiene que coincidir letra por letra. */
  valor: string;
  etiqueta: string;
  ayuda?: string;
}

/** El literal exacto que el backend compara para no exigir el PDF. */
export const TIPO_SIN_COMPROBANTE = 'Causas Personales';

/**
 * El único motivo que obliga a escribir la nota aclaratoria: ahí la nota ES la
 * explicación, no hay otra categoría que la describa.
 *
 * OJO: esto lo valida SOLO el front. El backend nunca mira `NotaAdicional`
 * (es `string?`), así que es una ayuda de UX, no una garantía.
 */
export const TIPO_NOTA_OBLIGATORIA = 'Otros';

export const TIPOS_INASISTENCIA: readonly TipoInasistencia[] = [
  {
    valor: 'Enfermedad',
    etiqueta: 'Enfermedad',
    ayuda: 'Adjuntá el certificado médico.',
  },
  {
    valor: TIPO_SIN_COMPROBANTE,
    etiqueta: 'Causas personales',
    ayuda: 'Es el único motivo que no exige comprobante.',
  },
  {
    valor: 'Compromisos Laborales',
    etiqueta: 'Compromisos laborales',
    ayuda: 'Adjuntá la constancia del empleador.',
  },
  {
    valor: TIPO_NOTA_OBLIGATORIA,
    etiqueta: 'Otros',
    ayuda: 'Explicá el motivo en la nota aclaratoria y adjuntá el comprobante.',
  },
  // "Duelo familiar" se sacó a pedido de Dirección (demo del 02/09/2026):
  // ese caso se encuadra dentro de "Causas personales", que además es el
  // único motivo que no exige comprobante.
];

/** Misma regla que aplica el backend, para no dejar enviar algo que va a fallar. */
export function exigeComprobante(tipoInasistencia: string): boolean {
  return tipoInasistencia !== TIPO_SIN_COMPROBANTE;
}

/** Si el motivo obliga a escribir la nota. Solo la valida el front (ver arriba). */
export function exigeNota(tipoInasistencia: string): boolean {
  return tipoInasistencia === TIPO_NOTA_OBLIGATORIA;
}
