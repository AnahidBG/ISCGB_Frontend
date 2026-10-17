import { firstValueFrom } from 'rxjs';
import { MesasExamenMockService } from './mesas-examen-mock.service';

describe('MesasExamenMockService', () => {
  let servicio: MesasExamenMockService;

  beforeEach(() => {
    servicio = new MesasExamenMockService();
  });

  it('una mesa se responde una sola vez, como en el backend', async () => {
    await firstValueFrom(servicio.responderAsignacion(1, false));

    await expect(firstValueFrom(servicio.responderAsignacion(1, true))).rejects.toThrow(
      'Esta asignación ya fue respondida anteriormente (Rechazada).',
    );
  });

  it('una mesa que no es del docente no se encuentra', async () => {
    await expect(firstValueFrom(servicio.responderAsignacion(99, true))).rejects.toThrow(
      'No se encontró la asignación a esta mesa de examen.',
    );
  });

  it('archivar una alerta la saca de la lista, y archivarla de nuevo falla', async () => {
    const [alerta] = await firstValueFrom(servicio.alertasDeRechazo());

    await firstValueFrom(servicio.ocultarAlerta(alerta.idExamen, alerta.idDocente));

    expect(await firstValueFrom(servicio.alertasDeRechazo())).toEqual([]);
    await expect(
      firstValueFrom(servicio.ocultarAlerta(alerta.idExamen, alerta.idDocente)),
    ).rejects.toThrow('Esta alerta ya fue procesada');
  });

  it('no deja asignar dos veces el mismo docente a la misma mesa', async () => {
    await firstValueFrom(servicio.asignarDocente(3, 1));

    await expect(firstValueFrom(servicio.asignarDocente(3, 1))).rejects.toThrow(
      'El docente ya se encuentra asignado a esta mesa de examen.',
    );
  });

  it('una mesa con un docente que no existe falla con el texto del backend', async () => {
    const mesa = {
      dia: '2026-11-20',
      horario: '09:00',
      idMateria: 1,
      idComision: 1,
      idTipoExamen: 1,
      idDocente: 99,
    };

    await expect(firstValueFrom(servicio.registrarMesa(mesa))).rejects.toThrow(
      'El docente seleccionado no existe.',
    );
  });
});
