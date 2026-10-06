/**
 * Los formatos curriculares de la Res. Ministerial N° 166/23 (plan de la
 * Tecnicatura Superior en Desarrollo de Software).
 *
 * Antes el formulario ofrecía "Materia teórica / práctica / teórico-práctica",
 * que no existen en el plan. Secretaría lo marcó en las correcciones del PDF
 * de prueba: el formato es el de la resolución.
 */
export const OPCIONES_FORMATO_CURRICULAR = [
  'Asignatura',
  'Taller',
  'Módulo teórico',
  'Módulo aplicado',
] as const;

export type FormatoCurricular = (typeof OPCIONES_FORMATO_CURRICULAR)[number];

/** Los códigos con que la tabla del plan de estudios abrevia cada formato. */
const FORMATO_POR_CODIGO: Record<string, FormatoCurricular> = {
  a: 'Asignatura',
  t: 'Taller',
  mt: 'Módulo teórico',
  ma: 'Módulo aplicado',
};

/** Minúsculas, sin tildes ni espacios sobrantes: "MÓDULO  Teórico" → "modulo teorico". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Traduce lo que guarda `materias.formato` a una de las opciones del plan.
 *
 * Acepta el código de la tabla ("A", "MT"…) o el nombre completo escrito de
 * cualquier forma. Lo que no reconoce devuelve `null`: el formulario lo deja
 * para elegir a mano en vez de mostrar un valor que no está en la lista.
 */
export function formatoCurricularDesde(valor: string | null | undefined): FormatoCurricular | null {
  if (!valor) {
    return null;
  }

  const buscado = normalizar(valor);
  return (
    FORMATO_POR_CODIGO[buscado] ??
    OPCIONES_FORMATO_CURRICULAR.find((opcion) => normalizar(opcion) === buscado) ??
    null
  );
}
