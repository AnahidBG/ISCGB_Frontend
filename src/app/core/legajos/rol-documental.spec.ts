import { idRolDocumentalDe } from './rol-documental';

describe('idRolDocumentalDe', () => {
  it('con un solo rol devuelve su id', () => {
    expect(idRolDocumentalDe([{ idRol: 4, nombreRol: 'Alumno' }])).toBe(4);
  });

  it('un director que además da clase presenta lo de Docente', () => {
    expect(
      idRolDocumentalDe([
        { idRol: 1, nombreRol: 'Director' },
        { idRol: 3, nombreRol: 'Docente' },
      ]),
    ).toBe(3);
  });

  it('sin roles conocidos devuelve null', () => {
    expect(idRolDocumentalDe([])).toBeNull();
    expect(idRolDocumentalDe([{ idRol: 9, nombreRol: 'Preceptor' }])).toBeNull();
  });
});
