import { ValoresNuevaMesa, aNuevaMesa, erroresDeNuevaMesa } from './nueva-mesa';

/** Sábado 10/10/2026 por la tarde. */
const HOY = new Date(2026, 9, 10, 15, 30);

const COMPLETOS: ValoresNuevaMesa = {
  dia: '2026-11-20',
  horario: '09:00',
  idMateria: '4',
  idComision: '1',
  idTipoExamen: '3',
  idDocente: '8',
};

describe('erroresDeNuevaMesa', () => {
  it('con todo completo y válido no hay errores', () => {
    expect(erroresDeNuevaMesa(COMPLETOS, HOY)).toEqual({});
  });

  it('cada campo vacío tiene su mensaje', () => {
    const vacios = Object.fromEntries(
      Object.keys(COMPLETOS).map((campo) => [campo, '']),
    ) as ValoresNuevaMesa;

    expect(erroresDeNuevaMesa(vacios, HOY)).toEqual({
      dia: 'Elegí la fecha de la mesa.',
      horario: 'Ingresá el horario de la mesa.',
      idMateria: 'Elegí la materia.',
      idComision: 'Elegí la comisión.',
      idTipoExamen: 'Elegí el tipo de examen.',
      idDocente: 'Elegí el docente que la preside.',
    });
  });

  it('no deja una fecha pasada, pero sí hoy', () => {
    expect(erroresDeNuevaMesa({ ...COMPLETOS, dia: '2026-10-09' }, HOY).dia).toBe(
      'La fecha no puede ser anterior a hoy.',
    );
    expect(erroresDeNuevaMesa({ ...COMPLETOS, dia: '2026-10-10' }, HOY)).toEqual({});
  });

  it('no deja una fecha que no existe ni un horario fuera de las 24 h', () => {
    const errores = erroresDeNuevaMesa({ ...COMPLETOS, dia: '2026-02-30', horario: '25:00' }, HOY);

    expect(errores.dia).toBe('La fecha no es válida.');
    expect(errores.horario).toContain('formato 24 h');
  });
});

describe('aNuevaMesa', () => {
  it('pasa los ids a número y deja el día y el horario como texto', () => {
    expect(aNuevaMesa(COMPLETOS)).toEqual({
      dia: '2026-11-20',
      horario: '09:00',
      idMateria: 4,
      idComision: 1,
      idTipoExamen: 3,
      idDocente: 8,
    });
  });
});
