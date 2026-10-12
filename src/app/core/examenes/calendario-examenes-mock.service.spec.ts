import { Observable, catchError, firstValueFrom, map, of } from 'rxjs';
import { CalendarioExamenesMockService } from './calendario-examenes-mock.service';
import { ExamenCalendario } from './modelos/examen-calendario';

const LIMITE_SUPERADO = 'No se puede reprogramar. El día ha superado el límite de parciales.';
const NO_ENCONTRADO = 'No se encontró el examen especificado.';

/** Espera la respuesta del mock, que tarda un rato a propósito. */
async function esperar<T>(pedido: Observable<T>): Promise<T> {
  const respuesta = firstValueFrom(pedido);
  await vi.advanceTimersByTimeAsync(1_000);
  return respuesta;
}

/** `null` si el pedido salió bien, o el mensaje con el que falló. */
function mensajeDeFallo(pedido: Observable<unknown>): Promise<string | null> {
  return esperar(
    pedido.pipe(
      map(() => null),
      catchError((fallo: Error) => of(fallo.message)),
    ),
  );
}

describe('CalendarioExamenesMockService: reprogramar y eliminar (SCRUM-184)', () => {
  let servicio: CalendarioExamenesMockService;

  /** Los parciales de ejemplo de octubre de 2026, por materia. */
  async function deOctubre(materia: string): Promise<ExamenCalendario> {
    const examenes = await esperar(servicio.examenesDelMes(2026, 10));
    return examenes.find((examen) => examen.materia === materia)!;
  }

  async function diaDeOctubre(fecha: string) {
    const calendario = await esperar(servicio.calendarioDelMes(2026, 10));
    return calendario.dias.find((dia) => dia.fecha === fecha)!;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    servicio = new CalendarioExamenesMockService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reprogramar mueve el parcial y el listado y el estado de los días lo reflejan', async () => {
    const pedagogia = await deOctubre('Pedagogía');
    expect(pedagogia).toMatchObject({ fecha: '2026-10-21', horario: '10:00' });

    expect(
      await mensajeDeFallo(servicio.reprogramarExamen(pedagogia.idExamen, '2026-10-22T11:30:00')),
    ).toBeNull();

    expect(await deOctubre('Pedagogía')).toMatchObject({ fecha: '2026-10-22', horario: '11:30' });
    expect(await diaDeOctubre('2026-10-21')).toMatchObject({ cantidad: 0, estado: 'disponible' });
    expect(await diaDeOctubre('2026-10-22')).toMatchObject({ cantidad: 1, estado: 'ocupado' });
  });

  it('respeta el límite del día, pero el parcial no se cuenta a sí mismo', async () => {
    const introduccion = await deOctubre('Introducción a Sistemas');
    const matematica = await deOctubre('Matemática');
    // Los dos del 12 completan el límite de 2.
    expect(await diaDeOctubre('2026-10-12')).toMatchObject({ cantidad: 2, estado: 'completo' });

    // Sumar un tercero al día completo se rechaza con el texto del backend, y no se mueve.
    expect(
      await mensajeDeFallo(
        servicio.reprogramarExamen(introduccion.idExamen, '2026-10-12T09:00:00'),
      ),
    ).toBe(LIMITE_SUPERADO);
    expect(await deOctubre('Introducción a Sistemas')).toMatchObject({ fecha: '2026-10-05' });

    // Cambiarle la hora a uno de los dos que ya están ese día sí se puede.
    expect(
      await mensajeDeFallo(servicio.reprogramarExamen(matematica.idExamen, '2026-10-12T16:00:00')),
    ).toBeNull();
    expect(await deOctubre('Matemática')).toMatchObject({ fecha: '2026-10-12', horario: '16:00' });
  });

  it('eliminar saca el parcial, y un examen que no existe falla como el 404 del backend', async () => {
    const pedagogia = await deOctubre('Pedagogía');

    expect(await mensajeDeFallo(servicio.eliminarExamen(pedagogia.idExamen))).toBeNull();

    const quedan = await esperar(servicio.examenesDelMes(2026, 10));
    expect(quedan.map((examen) => examen.materia)).not.toContain('Pedagogía');
    expect(await diaDeOctubre('2026-10-21')).toMatchObject({ cantidad: 0, estado: 'disponible' });

    expect(await mensajeDeFallo(servicio.eliminarExamen(pedagogia.idExamen))).toBe(NO_ENCONTRADO);
    expect(await mensajeDeFallo(servicio.reprogramarExamen(9_999, '2026-10-22T09:00:00'))).toBe(
      NO_ENCONTRADO,
    );
  });
});
