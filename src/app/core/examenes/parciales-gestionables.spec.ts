import { ExamenCalendario } from './modelos/examen-calendario';
import { parcialesGestionables } from './parciales-gestionables';

const parcial = (idExamen: number, puedeModificar: boolean): ExamenCalendario => ({
  idExamen,
  fecha: '2026-11-17',
  horario: '09:00',
  materia: 'Programación II',
  comision: 'Comisión A',
  tipo: 'Parcial',
  puedeModificar,
});

describe('parcialesGestionables', () => {
  it('son los que el backend marca con `puedeModificar`, por su id', () => {
    const examenes = [parcial(1, true), parcial(2, false), parcial(3, true)];

    expect([...parcialesGestionables(examenes)]).toEqual([1, 3]);
  });

  it('sin ninguno marcado no puede tocar ninguno', () => {
    expect(parcialesGestionables([parcial(1, false)]).size).toBe(0);
  });
});
