import { OPCIONES_FORMATO_CURRICULAR, formatoCurricularDesde } from './formato-curricular';

describe('formatoCurricularDesde', () => {
  it('las opciones son las de la Res. 166/23', () => {
    expect(OPCIONES_FORMATO_CURRICULAR).toEqual([
      'Asignatura',
      'Taller',
      'Módulo teórico',
      'Módulo aplicado',
    ]);
  });

  it('traduce los códigos del plan de estudios', () => {
    expect(formatoCurricularDesde('A')).toBe('Asignatura');
    expect(formatoCurricularDesde('T')).toBe('Taller');
    expect(formatoCurricularDesde('MT')).toBe('Módulo teórico');
    expect(formatoCurricularDesde('MA')).toBe('Módulo aplicado');
  });

  it('reconoce el nombre sin importar mayúsculas, tildes ni espacios', () => {
    expect(formatoCurricularDesde(' asignatura ')).toBe('Asignatura');
    expect(formatoCurricularDesde('MODULO TEORICO')).toBe('Módulo teórico');
    expect(formatoCurricularDesde('ma')).toBe('Módulo aplicado');
  });

  it('lo que no reconoce, o no viene, queda en null para cargarlo a mano', () => {
    expect(formatoCurricularDesde(null)).toBeNull();
    expect(formatoCurricularDesde(undefined)).toBeNull();
    expect(formatoCurricularDesde('')).toBeNull();
    expect(formatoCurricularDesde('Materia teórico-práctica')).toBeNull();
  });
});
