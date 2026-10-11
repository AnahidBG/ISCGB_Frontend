import { EstadoDiaCalendario } from './modelos/dia-calendario';

/** Un conteo válido: un entero de 0 para arriba. */
function esConteoValido(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;
}

/** Un límite válido: un entero de 1 para arriba. Con 0 o menos nadie podría registrar nada. */
function esLimiteValido(valor: unknown): valor is number {
  return esConteoValido(valor) && valor >= 1;
}

/**
 * El estado de un día del calendario, según cuántos parciales tiene y cuántos
 * admite el período.
 *
 *   · 0 parciales                  → `disponible`
 *   · más de 0 y menos que el límite → `ocupado`
 *   · el límite o más               → `completo`
 *
 * Es tolerante a propósito: si la cantidad o el límite no son números válidos
 * (nulos, texto, negativos, con decimales, `NaN`), el día se muestra
 * `disponible`. Un dato roto no tiene que tirar abajo el calendario ni pintar
 * de rojo un día que no sabemos si está completo; los parámetros son `unknown`
 * porque llegan de una respuesta que no controlamos.
 */
export function estadoDelDia(cantidad: unknown, limite: unknown): EstadoDiaCalendario {
  if (!esConteoValido(cantidad) || !esLimiteValido(limite) || cantidad === 0) {
    return 'disponible';
  }
  return cantidad >= limite ? 'completo' : 'ocupado';
}
