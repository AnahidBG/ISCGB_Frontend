import { normalizarDni } from '../auth/dni';

/**
 * CUIL: "20-43880335-7". Criterio de Sprint 2 "Gestión de usuarios y roles"
 * (Datos personales → CUIL) y campo obligatorio de `CargaUsuarioDto`.
 *
 * Igual que con el DNI, la persona lo escribe con guiones y el backend lo
 * guarda como texto libre (`Usuarios.cuil`, `varchar`): la validación de acá
 * es para ayudar a no equivocarse, no seguridad.
 */

/** Deja solo los dígitos. "20-43880335-7" → "20438803357" */
export function normalizarCuil(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Con guiones, para mostrar. "20438803357" → "20-43880335-7" */
export function formatearCuil(valor: string): string {
  const digitos = normalizarCuil(valor);
  if (digitos.length !== 11) {
    return valor;
  }
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`;
}

/** Pesos del dígito verificador (módulo 11), en el orden de los 10 primeros dígitos. */
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * ¿Es un CUIL bien formado?
 *
 * 11 dígitos y dígito verificador correcto. Cuando el cálculo da 10, AFIP
 * cambia el prefijo (20 → 23) y vuelve a calcular, así que un CUIL real
 * nunca termina con un verificador "10": si da eso, el número está mal.
 */
export function esCuilValido(valor: string): boolean {
  const digitos = normalizarCuil(valor);
  if (!/^\d{11}$/.test(digitos)) {
    return false;
  }

  const suma = PESOS.reduce((total, peso, i) => total + peso * Number(digitos[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto;

  return verificador !== 10 && verificador === Number(digitos[10]);
}

/**
 * ¿El CUIL corresponde a ese DNI? Los 8 dígitos del medio son el DNI
 * (con un cero adelante si tiene 7). Un CUIL válido pero de OTRA persona es
 * el error más probable al copiar datos de una planilla.
 */
export function cuilCoincideConDni(cuil: string, dni: string): boolean {
  const digitos = normalizarCuil(cuil);
  const dniLimpio = normalizarDni(dni).padStart(8, '0');
  return digitos.length === 11 && digitos.slice(2, 10) === dniLimpio;
}
