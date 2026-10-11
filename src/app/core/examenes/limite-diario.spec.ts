import { errorDeLimiteDiario, textoLimiteDiario } from './limite-diario';

describe('errorDeLimiteDiario', () => {
  it.each([1, 2, 99])('%i exámenes por día es un límite válido', (limite) => {
    expect(errorDeLimiteDiario(limite)).toBeNull();
  });

  it.each([
    ['vacío', null, 'Ingresá cuántos exámenes se pueden registrar por día.'],
    ['cero', 0, 'El límite tiene que ser de al menos 1 examen por día.'],
    ['negativo', -3, 'El límite tiene que ser de al menos 1 examen por día.'],
    ['con decimales', 1.5, 'Tiene que ser un número entero de exámenes, sin decimales.'],
    ['más de 99', 100, 'El límite no puede superar los 99 exámenes por día.'],
  ])('%s no se puede guardar, y dice por qué', (_caso, valor, mensaje) => {
    expect(errorDeLimiteDiario(valor)).toBe(mensaje);
  });
});

describe('textoLimiteDiario', () => {
  it('lo dice en singular o en plural', () => {
    expect(textoLimiteDiario(1)).toBe('1 examen por día');
    expect(textoLimiteDiario(3)).toBe('3 exámenes por día');
  });
});
