import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { MesasExamenHttpService } from './mesas-examen-http.service';
import {
  MENSAJE_ERROR_ALERTAS_RECHAZO,
  MENSAJE_ERROR_ASIGNAR_DOCENTE,
  MENSAJE_ERROR_OCULTAR_ALERTA,
  MENSAJE_ERROR_REGISTRAR_MESA,
  MENSAJE_ERROR_RESPONDER_MESA,
} from './mesas-examen.service';
import { AlertaRechazo } from './modelos/alerta-rechazo';

describe('MesasExamenHttpService', () => {
  let servicio: MesasExamenHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MesasExamenHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(MesasExamenHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  /** Se suscribe y devuelve una función que lee el mensaje del error, si hubo. */
  function mensajeDeError(pedido: { subscribe: (o: object) => unknown }): () => string | undefined {
    let mensaje: string | undefined;
    pedido.subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });
    return () => mensaje;
  }

  describe('registrar una mesa (SCRUM-245)', () => {
    const mesa = {
      dia: '2026-11-20',
      horario: '09:00',
      idMateria: 4,
      idComision: 1,
      idTipoExamen: 3,
      idDocente: 8,
    };

    it('manda `RegistrarMesaDto` con la fecha sin zona y devuelve el mensaje', () => {
      let mensaje = '';
      servicio.registrarMesa(mesa).subscribe((m) => (mensaje = m));

      const pedido = backend.expectOne(RUTAS_API.registrarMesaExamen);
      expect(pedido.request.method).toBe('POST');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/registrar-mesa');
      expect(pedido.request.body).toEqual({
        fecha: '2026-11-20T09:00:00',
        idMateria: 4,
        idComision: 1,
        idTipoExamen: 3,
        idDocente: 8,
      });
      pedido.flush({ message: 'Mesa de examen registrada exitosamente.', idExamen: 31 });

      expect(mensaje).toBe('Mesa de examen registrada exitosamente.');
    });

    it('un 400 muestra el mensaje del backend', () => {
      const mensaje = mensajeDeError(servicio.registrarMesa(mesa));

      backend
        .expectOne(RUTAS_API.registrarMesaExamen)
        .flush(
          { message: 'El docente seleccionado no existe.' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(mensaje()).toBe('El docente seleccionado no existe.');
    });

    it('un 500 da el mensaje genérico', () => {
      const mensaje = mensajeDeError(servicio.registrarMesa(mesa));

      backend
        .expectOne(RUTAS_API.registrarMesaExamen)
        .flush(
          { message: 'Ocurrió un error al registrar la mesa de examen.' },
          { status: 500, statusText: 'Error' },
        );

      expect(mensaje()).toBe(MENSAJE_ERROR_REGISTRAR_MESA);
    });
  });

  describe('asignar un docente a una mesa', () => {
    it('manda `{ idExamen, idDocente }` por POST y devuelve el mensaje', () => {
      let mensaje = '';
      servicio.asignarDocente(31, 9).subscribe((m) => (mensaje = m));

      const pedido = backend.expectOne(RUTAS_API.asignarDocenteAMesa);
      expect(pedido.request.method).toBe('POST');
      expect(pedido.request.url).toContain('/api/ConfiguracionCalendario/asignar-docente');
      expect(pedido.request.body).toEqual({ idExamen: 31, idDocente: 9 });
      pedido.flush({ message: 'Docente asignado correctamente. Se ha notificado al profesor.' });

      expect(mensaje).toBe('Docente asignado correctamente. Se ha notificado al profesor.');
    });

    it('un docente ya asignado muestra el mensaje del backend', () => {
      const mensaje = mensajeDeError(servicio.asignarDocente(31, 9));

      backend
        .expectOne(RUTAS_API.asignarDocenteAMesa)
        .flush(
          { message: 'El docente ya se encuentra asignado a esta mesa de examen.' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(mensaje()).toBe('El docente ya se encuentra asignado a esta mesa de examen.');
    });

    it('una ruta que no existe da el mensaje genérico', () => {
      const mensaje = mensajeDeError(servicio.asignarDocente(31, 9));

      backend.expectOne(RUTAS_API.asignarDocenteAMesa).flush(null, {
        status: 404,
        statusText: 'Not Found',
      });

      expect(mensaje()).toBe(MENSAJE_ERROR_ASIGNAR_DOCENTE);
    });
  });

  describe('responder una mesa (SCRUM-246)', () => {
    it.each([
      [true, 'acepta'],
      [false, 'rechaza'],
    ])('manda `{ idExamen, acepta: %s }` por PUT cuando %s', (acepta) => {
      let respondida = false;
      servicio.responderAsignacion(12, acepta).subscribe(() => (respondida = true));

      const pedido = backend.expectOne(RUTAS_API.responderAsignacionMesa);
      expect(pedido.request.method).toBe('PUT');
      expect(pedido.request.url).toContain('/api/Docente/responder-asignacion');
      expect(pedido.request.body).toEqual({ idExamen: 12, acepta });
      pedido.flush({ message: 'Ha aceptada la asignación a la mesa de examen.' });

      expect(respondida).toBe(true);
    });

    it('una mesa ya respondida muestra el mensaje del backend', () => {
      const mensaje = mensajeDeError(servicio.responderAsignacion(12, true));

      backend
        .expectOne(RUTAS_API.responderAsignacionMesa)
        .flush(
          { message: 'Esta asignación ya fue respondida anteriormente (Aceptada).' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(mensaje()).toBe('Esta asignación ya fue respondida anteriormente (Aceptada).');
    });

    it('un 500 da el mensaje genérico', () => {
      const mensaje = mensajeDeError(servicio.responderAsignacion(12, false));

      backend
        .expectOne(RUTAS_API.responderAsignacionMesa)
        .flush(null, { status: 500, statusText: 'Error' });

      expect(mensaje()).toBe(MENSAJE_ERROR_RESPONDER_MESA);
    });
  });

  describe('alertas de rechazo (SCRUM-247)', () => {
    it('adapta cada alerta con la fecha en hora local y descarta las ilegibles', () => {
      let alertas: AlertaRechazo[] | undefined;
      servicio.alertasDeRechazo().subscribe((valor) => (alertas = valor));

      const pedido = backend.expectOne(RUTAS_API.alertasRechazoMesas);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.url).toContain('/api/Configuracion/alertas-rechazos');
      pedido.flush([
        {
          idExamen: 31,
          idDocente: 8,
          docente: ' Ana Pérez ',
          materia: 'Redes',
          fecha: '2026-11-20T09:00:00',
          mensaje: 'Asignación rechazada. Requiere reasignar a un nuevo docente de forma urgente.',
        },
        { idExamen: 'x', idDocente: 8, docente: 'Ana', materia: 'Redes', fecha: '2026-11-20T09:00:00' },
        { idExamen: 32, idDocente: 8, docente: 'Ana', materia: 'Redes', fecha: '2026-11-21' },
      ]);

      expect(alertas).toEqual([
        {
          idExamen: 31,
          idDocente: 8,
          docente: 'Ana Pérez',
          materia: 'Redes',
          fecha: new Date(2026, 10, 20, 9, 0),
        },
      ]);
    });

    it('en segundo plano el pedido lleva SIN_CARGA_GLOBAL', () => {
      servicio.alertasDeRechazo({ enSegundoPlano: true }).subscribe();

      const pedido = backend.expectOne(RUTAS_API.alertasRechazoMesas);
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([]);
    });

    it.each([
      ['el servidor falla', () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } })],
      ['la respuesta no es una lista', () => ({ cuerpo: { data: [] }, opciones: {} })],
    ])('falla con su mensaje cuando %s', (_caso, respuesta) => {
      const mensaje = mensajeDeError(servicio.alertasDeRechazo());

      const { cuerpo, opciones } = respuesta();
      backend.expectOne(RUTAS_API.alertasRechazoMesas).flush(cuerpo, opciones);

      expect(mensaje()).toBe(MENSAJE_ERROR_ALERTAS_RECHAZO);
    });

    it('archivar una alerta manda `{ idExamen, idDocente }` por PUT', () => {
      let archivada = false;
      servicio.ocultarAlerta(31, 8).subscribe(() => (archivada = true));

      const pedido = backend.expectOne(RUTAS_API.ocultarAlertaRechazoMesa);
      expect(pedido.request.method).toBe('PUT');
      expect(pedido.request.url).toContain('/api/Configuracion/ocultar-alerta-rechazo');
      expect(pedido.request.body).toEqual({ idExamen: 31, idDocente: 8 });
      pedido.flush({ message: 'Alerta archivada.' });

      expect(archivada).toBe(true);
    });

    it('archivar una alerta ya procesada muestra el mensaje del backend', () => {
      const mensaje = mensajeDeError(servicio.ocultarAlerta(31, 8));

      backend
        .expectOne(RUTAS_API.ocultarAlertaRechazoMesa)
        .flush(
          { message: 'Esta alerta ya fue procesada o no se encuentra en estado de rechazo.' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(mensaje()).toBe('Esta alerta ya fue procesada o no se encuentra en estado de rechazo.');
    });

    it('archivar con un 500 da el mensaje genérico', () => {
      const mensaje = mensajeDeError(servicio.ocultarAlerta(31, 8));

      backend
        .expectOne(RUTAS_API.ocultarAlertaRechazoMesa)
        .flush(null, { status: 500, statusText: 'Error' });

      expect(mensaje()).toBe(MENSAJE_ERROR_OCULTAR_ALERTA);
    });
  });
});
