import { esDniValido, formatearDni, normalizarDni } from './dni';

/**
 * El DNI es el usuario del sistema: si se manda mal, nadie entra.
 * Por eso tiene tests propios.
 */
describe('normalizarDni', () => {
  it('saca los puntos', () => {
    expect(normalizarDni('12.345.678')).toBe('12345678');
  });

  it('saca los espacios', () => {
    expect(normalizarDni(' 12 345 678 ')).toBe('12345678');
  });

  it('deja igual un DNI que ya viene limpio', () => {
    expect(normalizarDni('12345678')).toBe('12345678');
  });

  it('descarta las letras', () => {
    // El backend hoy acepta "Lucas23" como DNI porque lo guarda como texto.
    // El frontend no le da una mano con eso.
    expect(normalizarDni('Lucas23')).toBe('23');
  });
});

describe('formatearDni', () => {
  it('pone los puntos para mostrar', () => {
    expect(formatearDni('12345678')).toBe('12.345.678');
  });

  it('funciona con 7 dígitos', () => {
    expect(formatearDni('9880335')).toBe('9.880.335');
  });
});

describe('esDniValido', () => {
  it('acepta 8 dígitos', () => {
    expect(esDniValido('12345678')).toBe(true);
  });

  it('acepta 7 dígitos', () => {
    expect(esDniValido('9880335')).toBe(true);
  });

  it('acepta un DNI escrito con puntos', () => {
    expect(esDniValido('12.345.678')).toBe(true);
  });

  it('rechaza uno demasiado corto', () => {
    expect(esDniValido('12345')).toBe(false);
  });

  it('rechaza uno demasiado largo', () => {
    expect(esDniValido('123456789')).toBe(false);
  });

  it('rechaza el vacío', () => {
    expect(esDniValido('')).toBe(false);
  });
});
