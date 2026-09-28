import { cuilCoincideConDni, esCuilValido, formatearCuil, normalizarCuil } from './cuil';

describe('CUIL', () => {
  it('normaliza sacando guiones y espacios', () => {
    expect(normalizarCuil('20-12345678-6')).toBe('20123456786');
    expect(normalizarCuil(' 20 12345678 6 ')).toBe('20123456786');
  });

  it('formatea con guiones', () => {
    expect(formatearCuil('20123456786')).toBe('20-12345678-6');
  });

  it('acepta un CUIL con el dígito verificador correcto', () => {
    expect(esCuilValido('20-12345678-6')).toBe(true);
    expect(esCuilValido('27-12345678-0')).toBe(true);
  });

  it('rechaza un dígito verificador equivocado', () => {
    expect(esCuilValido('20-12345678-5')).toBe(false);
  });

  it('rechaza largos distintos de 11', () => {
    expect(esCuilValido('20-1234567-6')).toBe(false);
    expect(esCuilValido('')).toBe(false);
  });

  it('verifica que el medio del CUIL sea el DNI', () => {
    expect(cuilCoincideConDni('20-12345678-6', '12.345.678')).toBe(true);
    expect(cuilCoincideConDni('20-12345678-6', '87654321')).toBe(false);
  });

  it('un DNI de 7 dígitos se compara con el cero adelante', () => {
    expect(esCuilValido('20-01234567-5')).toBe(true);
    expect(cuilCoincideConDni('20-01234567-5', '1234567')).toBe(true);
  });
});
