import {
  TIPOS_INASISTENCIA,
  TIPO_NOTA_OBLIGATORIA,
  TIPO_SIN_COMPROBANTE,
  exigeComprobante,
  exigeNota,
} from './tipo-inasistencia';

describe('tipo-inasistencia', () => {
  it('"Otros" es un motivo del desplegable, al final de la lista', () => {
    const valores = TIPOS_INASISTENCIA.map((t) => t.valor);
    expect(TIPO_NOTA_OBLIGATORIA).toBe('Otros');
    expect(valores).toContain('Otros');
    expect(valores[valores.length - 1]).toBe('Otros');
  });

  it('"Otros" exige la nota aclaratoria', () => {
    expect(exigeNota('Otros')).toBe(true);
  });

  it('los demás motivos y el vacío no exigen nota', () => {
    const otros = TIPOS_INASISTENCIA.filter((t) => t.valor !== 'Otros');
    expect(otros.length).toBeGreaterThan(0);
    for (const tipo of otros) {
      expect(exigeNota(tipo.valor)).toBe(false);
    }
    expect(exigeNota('')).toBe(false);
  });

  it('"Otros" sigue exigiendo el comprobante, como el backend', () => {
    expect(exigeComprobante('Otros')).toBe(true);
    expect(exigeComprobante(TIPO_SIN_COMPROBANTE)).toBe(false);
  });
});
