import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { ExamenesHttpService } from './examenes-http.service';
import { MENSAJE_ERROR_CALENDARIO } from './examenes.service';
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
});
