import { MesaAsignada } from '../examenes/modelos/mesa-asignada';
import { notificacionesPorMesas } from './notificaciones-mesas';

function mesa(parcial: Partial<MesaAsignada> & { idExamen: number }): MesaAsignada {
  return { materia: 'Redes', fecha: new Date(2026, 10, 20, 9, 0), ...parcial };
}

/** Sábado 10/10/2026 por la tarde. */
const HOY = new Date(2026, 9, 10, 15, 30);

describe('notificacionesPorMesas', () => {
  it('sin mesas no hay avisos', () => {
    expect(notificacionesPorMesas([], HOY)).toEqual([]);
  });

  it('arma el aviso con la materia, el día y la hora, y lleva a donde se responde (SCRUM-246)', () => {
    expect(notificacionesPorMesas([mesa({ idExamen: 1 })], HOY)).toEqual([
      {
        titulo: 'Te asignaron a la mesa de Redes',
        detalle: 'Viernes 20/11/2026, 09:00 h',
        url: '/docente/mesas',
        tono: 'pendiente',
      },
    ]);
  });

  it('escribe el día y la hora con un formato fijo: domingo, ceros a la izquierda y 24 h', () => {
    const detalles = [new Date(2026, 10, 22, 18, 30), new Date(2027, 2, 5, 14, 5)].map(
      (fecha) => notificacionesPorMesas([mesa({ idExamen: 1, fecha })], HOY)[0].detalle,
    );

    expect(detalles).toEqual(['Domingo 22/11/2026, 18:30 h', 'Viernes 05/03/2027, 14:05 h']);
  });

  it('deja afuera las mesas de días que ya pasaron, pero no las de hoy aunque la hora ya pasó', () => {
    const mesas = [
      mesa({ idExamen: 1, materia: 'Ayer', fecha: new Date(2026, 9, 9, 23, 59) }),
      mesa({ idExamen: 2, materia: 'Hoy temprano', fecha: new Date(2026, 9, 10, 8, 0) }),
      mesa({ idExamen: 3, materia: 'Mañana', fecha: new Date(2026, 9, 11, 8, 0) }),
    ];

    expect(notificacionesPorMesas(mesas, HOY).map((aviso) => aviso.titulo)).toEqual([
      'Te asignaron a la mesa de Hoy temprano',
      'Te asignaron a la mesa de Mañana',
    ]);
  });

  it('ordena por fecha, la más próxima primero, y cada mesa da un aviso distinto', () => {
    const mesas = [
      mesa({ idExamen: 1, materia: 'Redes', fecha: new Date(2026, 10, 20, 9, 0) }),
      mesa({ idExamen: 2, materia: 'Álgebra', fecha: new Date(2026, 9, 15, 10, 0) }),
      mesa({ idExamen: 3, materia: 'Redes', fecha: new Date(2026, 9, 28, 9, 0) }),
    ];

    const avisos = notificacionesPorMesas(mesas, HOY);

    expect(avisos.map((aviso) => aviso.detalle)).toEqual([
      'Jueves 15/10/2026, 10:00 h',
      'Miércoles 28/10/2026, 09:00 h',
      'Viernes 20/11/2026, 09:00 h',
    ]);
    // La campana identifica cada aviso por título, detalle, url y tono.
    const claves = avisos.map((aviso) =>
      JSON.stringify([aviso.titulo, aviso.detalle, aviso.url, aviso.tono]),
    );
    expect(new Set(claves).size).toBe(3);
  });
});
