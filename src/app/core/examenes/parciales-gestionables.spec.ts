import { ExamenCalendario } from './modelos/examen-calendario';
import { MateriaDelDocente } from './modelos/materia-del-docente';
import { parcialesGestionables } from './parciales-gestionables';

const parcial = (idExamen: number, materia: string, comision = 'Comisión A'): ExamenCalendario => ({
  idExamen,
  fecha: '2026-11-17',
  horario: '09:00',
  materia,
  comision,
  tipo: 'Parcial',
});

const PROGRAMACION_EN_A: MateriaDelDocente = {
  idMateria: 4,
  materia: 'Programación II',
  carrera: null,
  idComision: 1,
  comision: 'Comisión A',
};

describe('parcialesGestionables', () => {
  it('son los de las materias que dicta, en cualquier comisión y sin importar tildes ni mayúsculas', () => {
    const examenes = [
      parcial(1, 'Programación II'),
      parcial(2, ' programacion ii ', 'Comisión B'),
      parcial(3, 'Matemática'),
    ];

    expect([...parcialesGestionables(examenes, [PROGRAMACION_EN_A])]).toEqual([1, 2]);
  });

  it('sin materias asignadas no puede tocar ninguno', () => {
    expect(parcialesGestionables([parcial(1, 'Programación II')], []).size).toBe(0);
  });
});
