/**
 * Motivos de inasistencia para el desplegable de carga. Son los cuatro que
 * pidió la institución, con el texto tal cual lo pidieron.
 *
 * OJO con `valor`: es lo que se guarda y lo que después lee Secretaría en su
 * panel, en la campana y en la búsqueda. Además el backend compara
 * `TipoInasistencia == "Causas Personales"` para decidir si el PDF es
 * opcional: si no coincide exacto, exige el archivo. Por eso el valor va
 * separado de la etiqueta que se muestra.
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
    valor: 'Causas Médicas',
    etiqueta: 'Por causas médicas',
    ayuda: 'Adjuntá el certificado médico.',
  },
  {
    valor: 'Causas Académicas',
    etiqueta: 'Por causas académicas',
    ayuda: 'Adjuntá la constancia de la actividad académica.',
  },
  {
    valor: 'Otros Compromisos Laborales',
    etiqueta: 'Por otros compromisos laborales',
    ayuda: 'Adjuntá la constancia del empleador.',
  },
  {
    valor: TIPO_SIN_COMPROBANTE,
    etiqueta: 'Por causas personales',
    ayuda: 'Es el único motivo que no exige comprobante.',
  },
  // El 27/10/2026 estos cuatro reemplazaron a "Enfermedad", "Compromisos
  // Laborales" y "Otros" (antes ya se había sacado "Duelo familiar", que
  // entra en causas personales). Los justificativos viejos conservan el texto
  // con el que se cargaron.
];

/** Misma regla que aplica el backend, para no dejar enviar algo que va a fallar. */
export function exigeComprobante(tipoInasistencia: string): boolean {
  return tipoInasistencia !== TIPO_SIN_COMPROBANTE;
}
