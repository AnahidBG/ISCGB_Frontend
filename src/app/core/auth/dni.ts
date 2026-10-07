/**
 * La gente escribe el DNI como se lo enseñaron: "12.345.678".
 * El backend lo espera limpio: "12345678".
 *
 * Traducir entre las dos formas es responsabilidad del frontend.
 */

/** Deja solo los dígitos. "12.345.678" → "12345678" */
export function normalizarDni(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Agrega los puntos para mostrar. "12345678" → "12.345.678" */
export function formatearDni(valor: string): string {
  return normalizarDni(valor).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Un DNI argentino válido tiene entre 7 y 8 dígitos.
 *
 * Ojo: hoy el backend guarda el DNI como texto libre y acepta cosas como
 * "Lucas23". Esta validación es solo para ayudar al usuario a no equivocarse;
 * la validación que importa de verdad es la del backend.
 */
export function esDniValido(valor: string): boolean {
  const soloDigitos = normalizarDni(valor);
  return soloDigitos.length >= 7 && soloDigitos.length <= 8;
}
