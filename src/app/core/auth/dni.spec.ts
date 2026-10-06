import { esDniValido, formatearDni, normalizarDni } from './dni';

/**
 * El DNI es el usuario del sistema: si se manda mal, nadie entra.
 * Por eso tiene tests propios.
 */
describe('normalizarDni', () => {
  it('saca los puntos', () => {
    expect(normalizarDni('43.880.335')).toBe('43880335');
  });

  it('saca los espacios', () => {
    expect(normalizarDni(' 43 880 335 ')).toBe('43880335');
  });

  it('deja igual un DNI que ya viene limpio', () => {
    expect(normalizarDni('43880335')).toBe('43880335');
  });

  it('descarta las letras', () => {
    // El backend hoy acepta "Lucas23" como DNI porque lo guarda como texto.
    // El frontend no le da una mano con eso.
    expect(normalizarDni('Lucas23')).toBe('23');
  });
});

describe('formatearDni', () => {
  it('pone los puntos para mostrar', () => {
    expect(formatearDni('43880335')).toBe('43.880.335');
  });

  it('funciona con 7 dígitos', () => {
    expect(formatearDni('9880335')).toBe('9.880.335');
  });
});

describe('esDniValido', () => {
  it('acepta 8 dígitos', () => {
    expect(esDniValido('43880335')).toBe(true);
  });

  it('acepta 7 dígitos', () => {
    expect(esDniValido('9880335')).toBe(true);
  });

  it('acepta un DNI escrito con puntos', () => {
    expect(esDniValido('43.880.335')).toBe(true);
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
