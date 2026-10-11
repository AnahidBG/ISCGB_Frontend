import { textoDeExamenes } from './calendario-mes';

/** El mínimo que acepta el backend: con 0 o menos el `PUT` responde 400. */
export const LIMITE_DIARIO_MINIMO = 1;

/**
 * El tope es del FRONT: el backend no pone ninguno.
 *
 * Está para atajar un error de tipeo (200 en lugar de 2). Con un límite así
 * de alto ningún día llegaría a ser "Completo" y el límite dejaría de limitar.
 */
export const LIMITE_DIARIO_MAXIMO = 99;

/**
 * Por qué no se puede guardar ese límite, o `null` si está bien.
 *
 * Tiene que ser un número ENTERO de exámenes entre el mínimo y el máximo.
 * Recibe `null` cuando el campo está vacío (o tiene algo que no es un número).
 * Importa que nunca llegue vacío al `PUT`: el backend lo daría por válido y
 * dejaría el límite sin valor.
 */
export function errorDeLimiteDiario(limite: number | null): string | null {
  if (limite === null || Number.isNaN(limite)) {
    return 'Ingresá cuántos exámenes se pueden registrar por día.';
  }
  if (!Number.isInteger(limite)) {
    return 'Tiene que ser un número entero de exámenes, sin decimales.';
  }
  if (limite < LIMITE_DIARIO_MINIMO) {
    return `El límite tiene que ser de al menos ${textoDeExamenes(LIMITE_DIARIO_MINIMO)} por día.`;
  }
  if (limite > LIMITE_DIARIO_MAXIMO) {
    return `El límite no puede superar los ${textoDeExamenes(LIMITE_DIARIO_MAXIMO)} por día.`;
  }
  return null;
}

/** El límite en palabras: "1 examen por día", "3 exámenes por día". */
export function textoLimiteDiario(limite: number): string {
  return `${textoDeExamenes(limite)} por día`;
}
