import { NOMBRE_TIPO_MESA, tipoDeLaMesa } from './tipo-de-la-mesa';

describe('tipoDeLaMesa', () => {
  const TIPOS_DE_LA_BASE = [
    { idTipoExamen: 1, nombre: 'Parcial' },
    { idTipoExamen: 2, nombre: 'Recupetario' },
    { idTipoExamen: 3, nombre: 'Parcial Integrador Final' },
    { idTipoExamen: 4, nombre: 'Coloquio' },
    { idTipoExamen: 6, nombre: 'Final' },
  ];

  it('una mesa es un final: usa el id de "Final" y se muestra como "Mesa de examen"', () => {
    expect(tipoDeLaMesa(TIPOS_DE_LA_BASE)).toEqual({ idTipoExamen: 6, nombre: NOMBRE_TIPO_MESA });
  });

  it('no confunde "Parcial Integrador Final" con "Final"', () => {
    expect(tipoDeLaMesa(TIPOS_DE_LA_BASE.filter((t) => t.idTipoExamen !== 6))).toBeNull();
  });

  it('si la base tiene un tipo "Mesa de examen", usa ese antes que "Final"', () => {
    const tipos = [...TIPOS_DE_LA_BASE, { idTipoExamen: 9, nombre: 'mesa de exámen ' }];

    expect(tipoDeLaMesa(tipos)?.idTipoExamen).toBe(9);
  });

  it('sin ninguno de los dos devuelve null', () => {
    expect(tipoDeLaMesa([{ idTipoExamen: 4, nombre: 'Coloquio' }])).toBeNull();
  });
});
