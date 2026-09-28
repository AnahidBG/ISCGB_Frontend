import { aFechaSola, desdeFechaSola } from './fechas';

describe('fechas sin hora', () => {
  it('lee "YYYY-MM-DD" como ese mismo día en hora local (no corre un día por UTC)', () => {
    const fecha = desdeFechaSola('1990-05-14')!;
    expect(fecha.getFullYear()).toBe(1990);
    expect(fecha.getMonth()).toBe(4);
    expect(fecha.getDate()).toBe(14);
  });

  it('tolera la hora pegada que manda a veces .NET', () => {
    expect(desdeFechaSola('1990-05-14T00:00:00')!.getDate()).toBe(14);
  });

  it('ida y vuelta da el mismo texto', () => {
    expect(aFechaSola(desdeFechaSola('2001-12-31')!)).toBe('2001-12-31');
  });

  it('vacío o basura → null', () => {
    expect(desdeFechaSola(null)).toBeNull();
    expect(desdeFechaSola('')).toBeNull();
    expect(desdeFechaSola('mañana')).toBeNull();
  });
});
