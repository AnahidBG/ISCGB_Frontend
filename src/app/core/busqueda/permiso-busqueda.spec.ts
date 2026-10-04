import { puedeBuscar } from './permiso-busqueda';

describe('puedeBuscar', () => {
  it('Director y Secretario usan el buscador', () => {
    expect(puedeBuscar('Director')).toBe(true);
    expect(puedeBuscar('Secretario')).toBe(true);
  });

  it('Docente, Alumno o un rol desconocido no (caso por defecto)', () => {
    expect(puedeBuscar('Docente')).toBe(false);
    expect(puedeBuscar('Alumno')).toBe(false);
    expect(puedeBuscar('')).toBe(false);
    expect(puedeBuscar('Preceptor')).toBe(false);
  });
});
