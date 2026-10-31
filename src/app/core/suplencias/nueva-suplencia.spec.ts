import {
  ValoresNuevaSuplencia,
  aNuevaSuplencia,
  erroresDeNuevaSuplencia,
  mensajeDeSuplencia,
} from './nueva-suplencia';

const COMPLETOS: ValoresNuevaSuplencia = {
  idDocente: '8',
  desde: '2026-11-02',
  hasta: '2026-11-30',
};

describe('erroresDeNuevaSuplencia', () => {
  it('con docente y fechas válidas no hay errores, y el fin es opcional', () => {
    expect(erroresDeNuevaSuplencia(COMPLETOS)).toEqual({});
    expect(erroresDeNuevaSuplencia({ ...COMPLETOS, hasta: '' })).toEqual({});
  });

  it('pide el docente y la fecha de inicio', () => {
    expect(erroresDeNuevaSuplencia({ idDocente: '', desde: '', hasta: '' })).toEqual({
      idDocente: 'Elegí el docente.',
      desde: 'Elegí desde cuándo es la suplencia.',
    });
  });

  it('no deja una fecha que no existe ni un fin anterior al inicio', () => {
    expect(erroresDeNuevaSuplencia({ ...COMPLETOS, desde: '2026-02-30' }).desde).toBe(
      'La fecha no es válida.',
    );
    expect(erroresDeNuevaSuplencia({ ...COMPLETOS, hasta: '2026-11-01' }).hasta).toBe(
      'La suplencia no puede terminar antes de empezar.',
    );
    expect(erroresDeNuevaSuplencia({ ...COMPLETOS, hasta: '2026-11-02' })).toEqual({});
  });
});

describe('aNuevaSuplencia', () => {
  it('pasa el docente a número y un fin vacío a null', () => {
    expect(aNuevaSuplencia(COMPLETOS)).toEqual({
      idDocente: 8,
      desde: '2026-11-02',
      hasta: '2026-11-30',
    });
    expect(aNuevaSuplencia({ ...COMPLETOS, hasta: '' }).hasta).toBeNull();
  });
});

describe('mensajeDeSuplencia', () => {
  it('al asignar dice desde y, si lo hay, hasta cuándo', () => {
    expect(
      mensajeDeSuplencia(
        'Ana Pérez',
        { esSuplente: true, cuentaActiva: true },
        aNuevaSuplencia(COMPLETOS),
      ),
    ).toBe('Ana Pérez quedó como docente suplente del 02/11/2026 al 30/11/2026.');
    expect(
      mensajeDeSuplencia(
        'Ana Pérez',
        { esSuplente: true, cuentaActiva: true },
        aNuevaSuplencia({ ...COMPLETOS, hasta: '' }),
      ),
    ).toBe('Ana Pérez quedó como docente suplente desde el 02/11/2026.');
  });

  it('al dar de baja dice si la cuenta quedó inactiva o si conserva otros roles', () => {
    expect(mensajeDeSuplencia('Ana Pérez', { esSuplente: false, cuentaActiva: false })).toBe(
      'Ana Pérez dejó de ser suplente. Como no tenía otro rol, su cuenta quedó inactiva.',
    );
    expect(mensajeDeSuplencia('Ana Pérez', { esSuplente: false, cuentaActiva: true })).toBe(
      'Ana Pérez dejó de ser suplente: ya no entra como docente, pero conserva sus otros roles.',
    );
  });
});
