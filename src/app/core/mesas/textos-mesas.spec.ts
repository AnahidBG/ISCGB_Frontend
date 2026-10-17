import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { MesaAsignada } from '../examenes/modelos/mesa-asignada';
import {
  confirmacionDeRespuesta,
  cuandoEsLaMesa,
  fechaDeMesa,
  mesasPorResponder,
} from './textos-mesas';

registerLocaleData(localeEsAr);

function mesa(parcial: Partial<MesaAsignada> & { idExamen: number }): MesaAsignada {
  return { materia: 'Redes', fecha: new Date(2026, 10, 20, 9, 0), ...parcial };
}

/** Sábado 10/10/2026 por la tarde. */
const HOY = new Date(2026, 9, 10, 15, 30);

describe('mesasPorResponder', () => {
  it('deja afuera las de días que ya pasaron, pero no las de hoy aunque la hora ya pasó', () => {
    const mesas = [
      mesa({ idExamen: 1, fecha: new Date(2026, 9, 9, 23, 59) }),
      mesa({ idExamen: 2, fecha: new Date(2026, 9, 10, 8, 0) }),
      mesa({ idExamen: 3, fecha: new Date(2026, 9, 11, 8, 0) }),
    ];

    expect(mesasPorResponder(mesas, HOY).map(({ idExamen }) => idExamen)).toEqual([2, 3]);
  });

  it('ordena de la más próxima a la más lejana, sin tocar la lista original', () => {
    const mesas = [
      mesa({ idExamen: 1, fecha: new Date(2026, 10, 20, 9, 0) }),
      mesa({ idExamen: 2, fecha: new Date(2026, 9, 15, 10, 0) }),
    ];

    expect(mesasPorResponder(mesas, HOY).map(({ idExamen }) => idExamen)).toEqual([2, 1]);
    expect(mesas.map(({ idExamen }) => idExamen)).toEqual([1, 2]);
  });
});

describe('fechaDeMesa', () => {
  it('escribe el día con mayúscula, la fecha en palabras y la hora de 24 h', () => {
    expect(fechaDeMesa(new Date(2026, 10, 20, 9, 0), 'es-AR')).toBe(
      'Viernes 20 de noviembre de 2026, 09:00 h',
    );
  });
});

describe('cuandoEsLaMesa', () => {
  it('va en minúscula y sin el año, para usar dentro de una oración', () => {
    expect(cuandoEsLaMesa(new Date(2026, 10, 22, 18, 30), 'es-AR')).toBe(
      'domingo 22 de noviembre, 18:30 h',
    );
  });
});

describe('confirmacionDeRespuesta', () => {
  it('al aceptar confirma la mesa con su día y hora', () => {
    expect(confirmacionDeRespuesta(mesa({ idExamen: 1 }), true, 'es-AR')).toBe(
      'Aceptaste la mesa de Redes del viernes 20 de noviembre, 09:00 h.',
    );
  });

  it('al rechazar avisa que Dirección y Secretaría se enteran para reasignarla', () => {
    expect(confirmacionDeRespuesta(mesa({ idExamen: 1 }), false, 'es-AR')).toBe(
      'Rechazaste la mesa de Redes del viernes 20 de noviembre, 09:00 h. ' +
        'Dirección y Secretaría reciben el aviso para reasignarla.',
    );
  });
});
