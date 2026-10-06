import { errorDeFrecuencia, textoFrecuencia } from './frecuencia-avisos';

describe('errorDeFrecuencia (SCRUM-151)', () => {
  it.each([1, 7, 365])('%i días es una frecuencia válida', (dias) => {
    expect(errorDeFrecuencia(dias)).toBeNull();
  });

  it.each([
    ['vacío', null, 'Ingresá cada cuántos días se envían los avisos.'],
    ['cero', 0, 'La frecuencia tiene que ser de al menos 1 día.'],
    ['negativo', -3, 'La frecuencia tiene que ser de al menos 1 día.'],
    ['con decimales', 1.5, 'Tiene que ser un número entero de días, sin decimales.'],
    ['más de un año', 366, 'La frecuencia no puede superar los 365 días.'],
  ])('%s no se puede guardar, y dice por qué', (_caso, valor, mensaje) => {
    expect(errorDeFrecuencia(valor)).toBe(mensaje);
  });
});

describe('textoFrecuencia', () => {
  it('lo dice en singular o en plural', () => {
    expect(textoFrecuencia(1)).toBe('todos los días');
    expect(textoFrecuencia(7)).toBe('cada 7 días');
  });
});
