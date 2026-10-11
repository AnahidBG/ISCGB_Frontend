import { errorDeLimiteDiario, textoLimiteDiario } from './limite-diario';
import { PERIODO_DEL_LIMITE } from './periodo-limite';

describe('errorDeLimiteDiario', () => {
  it.each([1, 2, 99])('%i parciales por día es un límite válido', (limite) => {
    expect(errorDeLimiteDiario(limite)).toBeNull();
  });

  it.each([
    ['vacío', null, 'Ingresá cuántos parciales se pueden registrar por día.'],
    ['cero', 0, 'El límite tiene que ser de al menos 1 parcial por día.'],
    ['negativo', -3, 'El límite tiene que ser de al menos 1 parcial por día.'],
    ['con decimales', 1.5, 'Tiene que ser un número entero de parciales, sin decimales.'],
    ['más de 99', 100, 'El límite no puede superar los 99 parciales por día.'],
  ])('%s no se puede guardar, y dice por qué', (_caso, valor, mensaje) => {
    expect(errorDeLimiteDiario(valor)).toBe(mensaje);
  });
});

describe('textoLimiteDiario', () => {
  it('lo dice en singular o en plural', () => {
    expect(textoLimiteDiario(1)).toBe('1 parcial por día');
    expect(textoLimiteDiario(3)).toBe('3 parciales por día');
  });

  it('el período sale de la constante y no está escrito en cada texto', () => {
    expect(textoLimiteDiario(2)).toBe(`2 parciales por ${PERIODO_DEL_LIMITE}`);
    expect(errorDeLimiteDiario(0)).toContain(`por ${PERIODO_DEL_LIMITE}`);
  });
});
