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
    valor: 'Duelo Familiar',
    etiqueta: 'Duelo familiar',
    ayuda: 'Adjuntá el certificado o constancia correspondiente.',
  },
];

/** Misma regla que aplica el backend, para no dejar enviar algo que va a fallar. */
export function exigeComprobante(tipoInasistencia: string): boolean {
  return tipoInasistencia !== TIPO_SIN_COMPROBANTE;
}
