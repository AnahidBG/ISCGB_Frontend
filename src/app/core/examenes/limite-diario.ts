import { textoDeParciales } from './calendario-mes';
import { PERIODO_DEL_LIMITE } from './periodo-limite';

/** El mínimo que acepta el backend: con 0 o menos el `PUT` responde 400. */
export const LIMITE_DIARIO_MINIMO = 1;

/**
 * El tope es del FRONT: el backend no pone ninguno.
 *
 * Está para atajar un error de tipeo (200 en lugar de 2). Con un límite así
 * de alto ningún día llegaría a ser "Completo" y el límite dejaría de limitar.
 */
export const LIMITE_DIARIO_MAXIMO = 99;

/** "1 parcial por día", "3 parciales por día": el período sale de `PERIODO_DEL_LIMITE`. */
function porPeriodo(cantidad: number): string {
  return `${textoDeParciales(cantidad)} por ${PERIODO_DEL_LIMITE}`;
}

/**
 * Por qué no se puede guardar ese límite, o `null` si está bien.
 *
 * Tiene que ser un número ENTERO de parciales entre el mínimo y el máximo.
 * Recibe `null` cuando el campo está vacío (o tiene algo que no es un número).
 * Importa que nunca llegue vacío al `PUT`: el backend lo daría por válido y
 * dejaría el límite sin valor.
 */
export function errorDeLimiteDiario(limite: number | null): string | null {
  if (limite === null || Number.isNaN(limite)) {
    return `Ingresá cuántos parciales se pueden registrar por ${PERIODO_DEL_LIMITE}.`;
  }
  if (!Number.isInteger(limite)) {
    return 'Tiene que ser un número entero de parciales, sin decimales.';
  }
  if (limite < LIMITE_DIARIO_MINIMO) {
    return `El límite tiene que ser de al menos ${porPeriodo(LIMITE_DIARIO_MINIMO)}.`;
  }
  if (limite > LIMITE_DIARIO_MAXIMO) {
    return `El límite no puede superar los ${porPeriodo(LIMITE_DIARIO_MAXIMO)}.`;
  }
  return null;
}

/** El límite en palabras: "1 parcial por día", "3 parciales por día". */
export function textoLimiteDiario(limite: number): string {
  return porPeriodo(limite);
}
