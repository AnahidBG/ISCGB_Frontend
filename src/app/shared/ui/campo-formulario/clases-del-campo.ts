/**
 * Las clases de un control que va dentro de `app-campo-formulario`. Nacieron en
 * los formularios del calendario (registrar y modificar un parcial) y se mudaron
 * acá cuando las necesitaron también las mesas de examen.
 */
const CLASES_DEL_CAMPO =
  'w-full rounded-lg border bg-superficie px-4 py-3 text-texto hover:border-acento-verde focus:border-principal focus:ring-2 focus:ring-principal/20 focus:outline-none';

/** Las clases de un campo: el borde rojo si tiene error. */
export function clasesDelCampo(error: string | null): string {
  return `${CLASES_DEL_CAMPO} ${error === null ? 'border-borde' : 'border-rechazado'}`;
}

/** Une la ayuda de un campo con su error, para que un lector de pantalla lea los dos. */
export function descripcionDelCampo(
  idCampo: string,
  error: string | null,
  idAyuda?: string,
): string | null {
  const ids = [idAyuda, error === null ? null : `${idCampo}-error`].filter(Boolean);
  return ids.length === 0 ? null : ids.join(' ');
}
