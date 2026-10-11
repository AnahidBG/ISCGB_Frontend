import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { CalendarioExamenesHttpService } from './calendario-examenes-http.service';
import {
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO,
  MENSAJE_ERROR_LIMITE_DIARIO,
  MENSAJE_ERROR_MESAS_ASIGNADAS,
} from './calendario-examenes.service';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MesaAsignada } from './modelos/mesa-asignada';

describe('CalendarioExamenesHttpService (SCRUM-183)', () => {
  let servicio: CalendarioExamenesHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CalendarioExamenesHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CalendarioExamenesHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('pide estado-mes con el año y el mes por query', () => {
    servicio.calendarioDelMes(2026, 10).subscribe();

    const pedido = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.urlWithParams).toContain(
      '/api/ConfiguracionCalendario/estado-mes?anio=2026&mes=10',
    );
    pedido.flush({ limiteDiario: 2, diasOcupados: [] });
  });

  it('adapta la respuesta: todos los días del mes, con su estado, sin correr la fecha un día', () => {
    let calendario: CalendarioDelMes | undefined;
    servicio.calendarioDelMes(2026, 10).subscribe((valor) => (calendario = valor));

    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10)).flush({
      limiteDiario: 2,
      // Un `DateTime` de .NET serializado: sin zona, a medianoche.
      diasOcupados: [
        { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
        { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
      ],
    });

    expect(calendario?.limite).toBe(2);
    expect(calendario?.dias).toHaveLength(31);
    expect(calendario?.dias[0]).toEqual({
      fecha: '2026-10-01',
      cantidad: 0,
      limite: 2,
      estado: 'disponible',
    });
    expect(calendario?.dias[12]).toEqual({
      fecha: '2026-10-13',
      cantidad: 1,
      limite: 2,
      estado: 'ocupado',
    });
    expect(calendario?.dias[19]).toMatchObject({ fecha: '2026-10-20', estado: 'completo' });
  });

  it('en segundo plano el pedido lleva SIN_CARGA_GLOBAL, y sin la opción no', () => {
    servicio.calendarioDelMes(2026, 10, { enSegundoPlano: true }).subscribe();
    const enSegundoPlano = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(enSegundoPlano.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
    enSegundoPlano.flush({ limiteDiario: 2, diasOcupados: [] });

    servicio.calendarioDelMes(2026, 11).subscribe();
    const conVelo = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 11));
    expect(conVelo.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
    conVelo.flush({ limiteDiario: 2, diasOcupados: [] });
  });

  it('un día que no se puede leer no tira abajo el mes: queda disponible', () => {
    let calendario: CalendarioDelMes | undefined;
    servicio.calendarioDelMes(2026, 10).subscribe((valor) => (calendario = valor));

    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10)).flush({
      limiteDiario: 2,
      diasOcupados: [
        { fecha: 'ayer', cantidadExamenes: 1, limiteAlcanzado: false },
        { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
      ],
    });

    expect(calendario?.dias).toHaveLength(31);
    expect(calendario?.dias.filter((dia) => dia.cantidad > 0).map((dia) => dia.fecha)).toEqual([
      '2026-10-13',
    ]);
  });

  it.each([
    [
      'el servidor falla (un mes inválido responde 500)',
      () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } }),
    ],
    [
      'la respuesta no trae el límite diario',
      () => ({ cuerpo: { diasOcupados: [] }, opciones: {} }),
    ],
    [
      'la respuesta no trae la lista de días',
      () => ({ cuerpo: { limiteDiario: 2, diasOcupados: 'nada' }, opciones: {} }),
    ],
  ])('falla con el mensaje de siempre cuando %s', (_caso, respuesta) => {
    let mensaje: string | undefined;
    servicio
      .calendarioDelMes(2026, 13)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    const { cuerpo, opciones } = respuesta();
    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 13)).flush(cuerpo, opciones);

    expect(mensaje).toBe(MENSAJE_ERROR_CALENDARIO);
  });

  it('el listado de exámenes del mes viene vacío y no pega contra el backend', () => {
    let examenes: ExamenCalendario[] | undefined;
    servicio.examenesDelMes(2026, 10).subscribe((valor) => (examenes = valor));

    // `backend.verify()`, en el afterEach, falla si salió algún pedido.
    expect(examenes).toEqual([]);
  });

  it('el límite vigente sale del `estado-mes` del mes actual', () => {
    // Solo el reloj: los timers de verdad tienen que seguir andando.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 10));

    let limite: number | undefined;
    servicio.limiteDiario().subscribe((valor) => (limite = valor));

    const pedido = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(pedido.request.method).toBe('GET');
    pedido.flush({
      limiteDiario: 3,
      diasOcupados: [{ fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false }],
    });

    expect(limite).toBe(3);
  });

  it('si no se puede leer el límite falla con su propio mensaje y no con el del calendario', () => {
    let mensaje: string | undefined;
    servicio.limiteDiario().subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne((pedido) => pedido.url.includes('/estado-mes'))
      .flush(null, { status: 500, statusText: 'Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_LIMITE_DIARIO);
  });

  it('guardar el límite manda `{ nuevoLimite }` por PUT', () => {
    let guardado = false;
    servicio.guardarLimiteDiario(3).subscribe(() => (guardado = true));

    const pedido = backend.expectOne(RUTAS_API.limiteParcialesCalendario);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ nuevoLimite: 3 });
    pedido.flush({
      message: 'El límite de parciales por día se ha actualizado con éxito.',
      nuevoLimite: 3,
    });

    expect(guardado).toBe(true);
  });

  it('si el backend rechaza el límite (400), guardar falla con SU mensaje', () => {
    let mensaje: string | undefined;
    servicio
      .guardarLimiteDiario(0)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.limiteParcialesCalendario)
      .flush(
        { message: 'El límite de parciales Diarios debe ser mayor a cero.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('El límite de parciales Diarios debe ser mayor a cero.');
  });

  it('ante un error del servidor (500), guardar el límite falla con el mensaje genérico', () => {
    let mensaje: string | undefined;
    servicio
      .guardarLimiteDiario(3)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.limiteParcialesCalendario)
      .flush({ message: 'NullReferenceException' }, { status: 500, statusText: 'Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO);
  });

  describe('mesas asignadas al docente', () => {
    it('pide mis-notificaciones y traduce la fecha con hora a hora local, sin usar el mensaje', () => {
      let mesas: MesaAsignada[] | undefined;
      servicio.mesasAsignadas({ enSegundoPlano: true }).subscribe((valor) => (mesas = valor));

      const pedido = backend.expectOne(RUTAS_API.misMesasAsignadas);
      expect(pedido.request.method).toBe('GET');
      expect(pedido.request.url).toContain('/api/Configuracion/mis-notificaciones');
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([
        {
          idExamen: 1,
          materia: 'Redes',
          // Un `DateTime` de .NET serializado: sin zona, CON hora.
          fecha: '2026-11-20T09:00:00',
          mensaje: 'Ha sido asignado a la mesa de Redes el día 20/11/2026 09:00',
        },
      ]);

      expect(mesas).toEqual([
        { idExamen: 1, materia: 'Redes', fecha: new Date(2026, 10, 20, 9, 0) },
      ]);
    });

    it('un usuario sin perfil de docente (404) no tiene mesas: no es un error', () => {
      let mesas: MesaAsignada[] | undefined;
      servicio.mesasAsignadas().subscribe((valor) => (mesas = valor));

      backend
        .expectOne(RUTAS_API.misMesasAsignadas)
        .flush({ message: 'Docente no encontrado.' }, { status: 404, statusText: 'Not Found' });

      expect(mesas).toEqual([]);
    });

    it.each([
      [
        'el servidor falla',
        () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } }),
      ],
      ['la respuesta no es una lista', () => ({ cuerpo: { mesas: [] }, opciones: {} })],
      [
        'una mesa trae una fecha que no es una fecha',
        () => ({
          cuerpo: [{ idExamen: 1, materia: 'Redes', fecha: 'pronto', mensaje: '' }],
          opciones: {},
        }),
      ],
    ])('falla con el mensaje de siempre cuando %s', (_caso, respuesta) => {
      let mensaje: string | undefined;
      servicio.mesasAsignadas().subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

      const { cuerpo, opciones } = respuesta();
      backend.expectOne(RUTAS_API.misMesasAsignadas).flush(cuerpo, opciones);

      expect(mensaje).toBe(MENSAJE_ERROR_MESAS_ASIGNADAS);
    });
  });
});
