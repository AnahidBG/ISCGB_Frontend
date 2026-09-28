/**
 * Fechas SIN hora (`DateOnly` en el backend: fecha de nacimiento).
 *
 * `new Date("1990-05-14")` NO es el 14 de mayo a la medianoche de acá: el
 * estándar dice que una fecha sola en formato ISO se interpreta en UTC, y en
 * Argentina (UTC-3) eso es el 13 de mayo a las 21 hs. Mostrado con
 * `getDate()`, el formulario de "Editar Usuario" precargaba la fecha de
 * nacimiento UN DÍA ANTES — y al guardar, la corría un día más.
 *
 * Estas dos funciones hacen la ida y la vuelta en hora local.
 */

/** `Date` → "1990-05-14". Lo que espera un `DateOnly` de .NET y un `<input type="date">`. */
export function aFechaSola(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * "1990-05-14" (o "1990-05-14T00:00:00") → 14/05/1990 a las 00:00 HORA LOCAL.
 * Devuelve `null` para vacío o para un texto que no es una fecha.
 */
export function desdeFechaSola(valor: string | null | undefined): Date | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
  if (coincidencia === null) {
    return null;
  }
  const [, anio, mes, dia] = coincidencia;
  const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}
