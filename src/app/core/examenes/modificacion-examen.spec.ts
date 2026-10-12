import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { ExamenCalendario } from './modelos/examen-calendario';
import {
  avisoDeParcialEliminado,
  avisoDeParcialReprogramado,
  hayCambiosEnElParcial,
  preguntaDeEliminarParcial,
} from './modificacion-examen';

registerLocaleData(localeEsAr);

const PARCIAL: ExamenCalendario = {
  idExamen: 7,
  fecha: '2026-10-13',
  horario: '09:00',
  materia: 'Matemática',
  comision: 'Comisión 1° A',
  tipo: 'Parcial',
};

describe('hayCambiosEnElParcial', () => {
  it.each([
    ['el mismo día y la misma hora', '2026-10-13', '09:00', false],
    ['otro día', '2026-10-14', '09:00', true],
    ['otra hora', '2026-10-13', '10:30', true],
    ['otro día y otra hora', '2026-10-14', '10:30', true],
  ])('con %s', (_caso, dia, horario, esperado) => {
    expect(hayCambiosEnElParcial(PARCIAL, dia, horario)).toBe(esperado);
  });
});

describe('textos de modificar y eliminar un parcial', () => {
  it('nombran el día y, al reprogramar, la hora', () => {
    expect(avisoDeParcialReprogramado('2026-10-14', '10:30', 'es-AR')).toBe(
      'Parcial reprogramado para el miércoles 14 de octubre a las 10:30.',
    );
    expect(avisoDeParcialEliminado('Matemática', '2026-10-13', 'es-AR')).toBe(
      'Parcial de Matemática del martes 13 de octubre eliminado.',
    );
    expect(preguntaDeEliminarParcial('Matemática', '2026-10-13', 'es-AR')).toBe(
      '¿Eliminar el parcial de Matemática del martes 13 de octubre?',
    );
  });
});
