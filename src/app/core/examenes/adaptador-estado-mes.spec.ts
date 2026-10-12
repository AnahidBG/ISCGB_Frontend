import { aCalendarioDelMes } from './adaptador-estado-mes';

const OCTUBRE = { anio: 2026, mes: 10 };

/** Una respuesta de `estado-mes` con los días ocupados que se le pasen. */
function respuesta(diasOcupados: unknown[], limiteDiario: unknown = 2) {
  return { limiteDiario, diasOcupados };
}

describe('aCalendarioDelMes', () => {
  it('arma TODOS los días del mes, con cantidad 0 en los que el backend no lista', () => {
    const { limite, dias } = aCalendarioDelMes(
      respuesta([
        // Un `DateTime` de .NET serializado: sin zona, a medianoche.
        { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
        { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
      ]),
      OCTUBRE,
    );

    expect(limite).toBe(2);
    expect(dias).toHaveLength(31);
    expect(dias[0]).toEqual({ fecha: '2026-10-01', cantidad: 0, limite: 2, estado: 'disponible' });
    expect(dias[12]).toEqual({ fecha: '2026-10-13', cantidad: 1, limite: 2, estado: 'ocupado' });
    expect(dias[19]).toEqual({ fecha: '2026-10-20', cantidad: 2, limite: 2, estado: 'completo' });
    expect(dias[30].fecha).toBe('2026-10-31');
  });

  it.each([
    ['abril', 30, { anio: 2026, mes: 4 }],
    ['febrero común', 28, { anio: 2027, mes: 2 }],
    ['febrero bisiesto', 29, { anio: 2028, mes: 2 }],
  ])('%s tiene %i días', (_caso, cantidad, mes) => {
    expect(aCalendarioDelMes(respuesta([]), mes).dias).toHaveLength(cantidad);
  });

  it('el estado sale de la cantidad y del límite, y no del `limiteAlcanzado` del backend', () => {
    const { dias } = aCalendarioDelMes(
      respuesta([{ fecha: '2026-10-05T00:00:00', cantidadExamenes: 2, limiteAlcanzado: false }], 3),
      OCTUBRE,
    );

    expect(dias[4]).toMatchObject({ cantidad: 2, limite: 3, estado: 'ocupado' });
  });

  it('descarta una entrada ilegible y ese día queda disponible, sin tirar abajo el mes', () => {
    const { dias } = aCalendarioDelMes(
      respuesta([
        { fecha: 'ayer', cantidadExamenes: 1 },
        { fecha: '2026-10-14T00:00:00', cantidadExamenes: 'uno' },
        { fecha: '2026-10-15T00:00:00', cantidadExamenes: -1 },
        { fecha: null, cantidadExamenes: 1 },
        null,
        'basura',
        { fecha: '2026-10-16T00:00:00', cantidadExamenes: 1 },
      ]),
      OCTUBRE,
    );

    const ocupados = dias.filter((dia) => dia.cantidad > 0);
    expect(dias).toHaveLength(31);
    expect(ocupados.map((dia) => dia.fecha)).toEqual(['2026-10-16']);
    expect(dias[13]).toMatchObject({ cantidad: 0, estado: 'disponible' });
  });

  it('ignora un día que es de otro mes', () => {
    const { dias } = aCalendarioDelMes(
      respuesta([{ fecha: '2026-11-03T00:00:00', cantidadExamenes: 1 }]),
      OCTUBRE,
    );

    expect(dias.every((dia) => dia.cantidad === 0)).toBe(true);
  });

  it.each([
    ['no hay respuesta', null],
    ['no es un objeto', 'hola'],
    ['no trae el límite', { diasOcupados: [] }],
    ['el límite no es un número', respuesta([], 'dos')],
    ['los días ocupados no son una lista', { limiteDiario: 2, diasOcupados: {} }],
  ])('si la respuesta entera no se puede leer es un error: %s', (_caso, cuerpo) => {
    expect(() => aCalendarioDelMes(cuerpo, OCTUBRE)).toThrow();
  });
});
