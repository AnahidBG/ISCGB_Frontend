import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { ExamenesHttpService } from './examenes-http.service';
import {
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_GUARDAR_LIMITE_DIARIO,
  MENSAJE_ERROR_LIMITE_DIARIO,
} from './examenes.service';
import { EstadoMes } from './modelos/estado-mes';

describe('ExamenesHttpService (SCRUM-183)', () => {
  let servicio: ExamenesHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExamenesHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ExamenesHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('pide estado-mes con el año y el mes por query', () => {
    servicio.estadoDelMes(2026, 10).subscribe();

    const pedido = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(pedido.request.method).toBe('GET');
    expect(pedido.request.urlWithParams).toContain(
      '/api/ConfiguracionCalendario/estado-mes?anio=2026&mes=10',
    );
    pedido.flush({ limiteDiario: 2, diasOcupados: [] });
  });

  it('traduce la respuesta al modelo sin correr la fecha un día', () => {
    let estado: EstadoMes | undefined;
    servicio.estadoDelMes(2026, 10).subscribe((valor) => (estado = valor));

    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10)).flush({
      limiteDiario: 2,
      // Un `DateTime` de .NET serializado: sin zona, a medianoche.
      diasOcupados: [{ fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false }],
    });

    expect(estado).toEqual({
      limiteDiario: 2,
      diasOcupados: [{ fecha: new Date(2026, 9, 13), cantidadExamenes: 1, limiteAlcanzado: false }],
    });
  });

  it('en segundo plano el pedido lleva SIN_CARGA_GLOBAL, y sin la opción no', () => {
    servicio.estadoDelMes(2026, 10, { enSegundoPlano: true }).subscribe();
    const enSegundoPlano = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 10));
    expect(enSegundoPlano.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
    enSegundoPlano.flush({ limiteDiario: 2, diasOcupados: [] });

    servicio.estadoDelMes(2026, 11).subscribe();
    const conVelo = backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 11));
    expect(conVelo.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
    conVelo.flush({ limiteDiario: 2, diasOcupados: [] });
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
      'un día trae una fecha que no es una fecha',
      () => ({
        cuerpo: {
          limiteDiario: 2,
          diasOcupados: [{ fecha: 'ayer', cantidadExamenes: 1, limiteAlcanzado: false }],
        },
        opciones: {},
      }),
    ],
  ])('falla con el mensaje de siempre cuando %s', (_caso, respuesta) => {
    let mensaje: string | undefined;
    servicio
      .estadoDelMes(2026, 13)
      .subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    const { cuerpo, opciones } = respuesta();
    backend.expectOne(RUTAS_API.estadoMesCalendario(2026, 13)).flush(cuerpo, opciones);

    expect(mensaje).toBe(MENSAJE_ERROR_CALENDARIO);
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
});
