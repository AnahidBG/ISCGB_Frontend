import { tiposQueRegistraElDocente } from './tipos-del-docente';

describe('tiposQueRegistraElDocente', () => {
  it('deja solo Parcial, Recuperatorio y Final, que son los que acepta `registrar`', () => {
    const tipos = [
      { idTipoExamen: 1, nombre: 'Parcial' },
      { idTipoExamen: 2, nombre: 'Recupetario' },
      { idTipoExamen: 3, nombre: 'Parcial Integrador Final' },
      { idTipoExamen: 4, nombre: 'Coloquio' },
      { idTipoExamen: 5, nombre: 'Recuperatorio' },
      { idTipoExamen: 6, nombre: 'Final' },
    ];

    expect(tiposQueRegistraElDocente(tipos).map((tipo) => tipo.idTipoExamen)).toEqual([1, 5, 6]);
  });

  it('sin ninguno de esos tres queda vacío', () => {
    expect(tiposQueRegistraElDocente([{ idTipoExamen: 4, nombre: 'Coloquio' }])).toEqual([]);
  });
});
