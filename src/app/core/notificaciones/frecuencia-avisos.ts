/** El mínimo que acepta el backend: con 0 o menos el `PUT` responde 400. */
export const DIAS_FRECUENCIA_MINIMO = 1;

/**
 * El tope es del FRONT: el backend no pone ninguno.
 *
 * Con un valor enorme el chequeo diario del servidor falla al calcular la
 * fecha límite y deja de mandar avisos, sin avisarle a nadie (reportado al
 * equipo de backend). Y más de un año entre un recordatorio y el siguiente ya
 * es no recordar.
 */
export const DIAS_FRECUENCIA_MAXIMO = 365;

/**
 * Por qué no se puede guardar esa frecuencia, o `null` si está bien.
 *
 * Tiene que ser un número ENTERO de días entre el mínimo y el máximo. Recibe
 * `null` cuando el campo está vacío (o tiene algo que no es un número).
 */
export function errorDeFrecuencia(dias: number | null): string | null {
  if (dias === null || Number.isNaN(dias)) {
    return 'Ingresá cada cuántos días se envían los avisos.';
  }
  if (!Number.isInteger(dias)) {
    return 'Tiene que ser un número entero de días, sin decimales.';
  }
  if (dias < DIAS_FRECUENCIA_MINIMO) {
    return `La frecuencia tiene que ser de al menos ${DIAS_FRECUENCIA_MINIMO} día.`;
  }
  if (dias > DIAS_FRECUENCIA_MAXIMO) {
    return `La frecuencia no puede superar los ${DIAS_FRECUENCIA_MAXIMO} días.`;
  }
  return null;
}

/** La frecuencia en palabras: "todos los días", "cada 7 días". */
export function textoFrecuencia(dias: number): string {
  return dias === 1 ? 'todos los días' : `cada ${dias} días`;
}
