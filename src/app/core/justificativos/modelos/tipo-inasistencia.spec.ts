import { TIPOS_INASISTENCIA, exigeComprobante } from './tipo-inasistencia';

describe('tipo-inasistencia', () => {
  it('ofrece los cuatro motivos que pidió la institución, en ese orden', () => {
    expect(TIPOS_INASISTENCIA.map((t) => t.etiqueta)).toEqual([
      'Por causas médicas',
      'Por causas académicas',
      'Por otros compromisos laborales',
      'Por causas personales',
    ]);
  });

  it('solo "Por causas personales" no exige comprobante, con el literal que compara el backend', () => {
    const personales = TIPOS_INASISTENCIA.find((t) => t.etiqueta === 'Por causas personales');

    expect(personales?.valor).toBe('Causas Personales');
    expect(TIPOS_INASISTENCIA.filter((t) => !exigeComprobante(t.valor))).toEqual([personales]);
  });
});
