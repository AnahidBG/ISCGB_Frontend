import { aExamenesDelMes } from './adaptador-examenes-mes';

const OCTUBRE = { anio: 2026, mes: 10 };

/** Un elemento de `del-mes`, con lo que se le pise. */
function examen(datos: Record<string, unknown> = {}) {
  return {
    idExamen: 7,
    materia: 'Redes',
    // Un `DateTime` de .NET serializado: sin zona y con hora.
    fecha: '2026-10-20T09:00:00',
    comision: 'Comisión 1° A',
    tipoExamen: 'Parcial',
    ...datos,
  };
}

describe('aExamenesDelMes', () => {
  it('separa la fecha y la hora sin correr el día, y traduce `tipoExamen` a `tipo`', () => {
    expect(aExamenesDelMes([examen()], OCTUBRE)).toEqual([
      {
        idExamen: 7,
        fecha: '2026-10-20',
        horario: '09:00',
        materia: 'Redes',
        comision: 'Comisión 1° A',
        tipo: 'Parcial',
      },
    ]);
  });

  it('los ordena por día y hora', () => {
    const examenes = aExamenesDelMes(
      [
        examen({ idExamen: 1, fecha: '2026-10-21T08:00:00' }),
        examen({ idExamen: 2, fecha: '2026-10-20T14:00:00' }),
        examen({ idExamen: 3, fecha: '2026-10-20T09:30:00' }),
      ],
      OCTUBRE,
    );

    expect(examenes.map(({ idExamen }) => idExamen)).toEqual([3, 2, 1]);
  });

  it('recorta los textos y pone un nombre por defecto a los vacíos', () => {
    const [unico] = aExamenesDelMes(
      [examen({ materia: '  Redes ', comision: ' ', tipoExamen: null })],
      OCTUBRE,
    );

    expect(unico).toMatchObject({ materia: 'Redes', comision: 'Sin comisión', tipo: 'Examen' });
  });

  it('descarta un examen ilegible sin tirar abajo los demás', () => {
    const examenes = aExamenesDelMes(
      [
        examen({ idExamen: 0 }),
        examen({ idExamen: 'siete' }),
        examen({ fecha: 'mañana' }),
        // Sin hora no se sabe a qué hora es: no se inventa una.
        examen({ fecha: '2026-10-20' }),
        null,
        'basura',
        examen({ idExamen: 9 }),
      ],
      OCTUBRE,
    );

    expect(examenes.map(({ idExamen }) => idExamen)).toEqual([9]);
  });

  it('ignora un examen de otro mes', () => {
    expect(aExamenesDelMes([examen({ fecha: '2026-11-03T09:00:00' })], OCTUBRE)).toEqual([]);
  });

  it.each([
    ['no hay respuesta', null],
    ['no es una lista', { data: [] }],
  ])('si la respuesta entera no se puede leer es un error: %s', (_caso, cuerpo) => {
    expect(() => aExamenesDelMes(cuerpo, OCTUBRE)).toThrow();
  });
});
