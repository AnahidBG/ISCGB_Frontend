import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { FrecuenciaAvisosHttpService } from './frecuencia-avisos-http.service';
import {
  MENSAJE_ERROR_FRECUENCIA,
  MENSAJE_ERROR_GUARDAR_FRECUENCIA,
} from './frecuencia-avisos.service';

describe('FrecuenciaAvisosHttpService (SCRUM-151)', () => {
  let servicio: FrecuenciaAvisosHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FrecuenciaAvisosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(FrecuenciaAvisosHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  it('obtener desenvuelve `diasFrecuencia` del GET', () => {
    let dias: number | undefined;
    servicio.obtener().subscribe((valor) => (dias = valor));

    const pedido = backend.expectOne(RUTAS_API.frecuenciaNotificaciones);
    expect(pedido.request.method).toBe('GET');
    pedido.flush({ diasFrecuencia: 14 });

    expect(dias).toBe(14);
  });

  it.each([
    ['el servidor falla', () => ({ cuerpo: null, opciones: { status: 500, statusText: 'Error' } })],
    ['la respuesta no trae un número', () => ({ cuerpo: { diasFrecuencia: 'siete' }, opciones: {} })],
  ])('obtener falla con un mensaje legible cuando %s', (_caso, respuesta) => {
    let mensaje: string | undefined;
    servicio.obtener().subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    const { cuerpo, opciones } = respuesta();
    backend.expectOne(RUTAS_API.frecuenciaNotificaciones).flush(cuerpo, opciones);

    expect(mensaje).toBe(MENSAJE_ERROR_FRECUENCIA);
  });

  it('guardar manda `{ diasFrecuencia }` por PUT', () => {
    let guardado = false;
    servicio.guardar(30).subscribe(() => (guardado = true));

    const pedido = backend.expectOne(RUTAS_API.frecuenciaNotificaciones);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ diasFrecuencia: 30 });
    pedido.flush({ message: 'Frecuencia actualizada a 30 días exitosamente.' });

    expect(guardado).toBe(true);
  });

  it('si el backend rechaza el valor (400), guardar falla con SU mensaje', () => {
    let mensaje: string | undefined;
    servicio.guardar(0).subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.frecuenciaNotificaciones)
      .flush(
        { message: 'La frecuencia debe ser mayor a 0 días.' },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(mensaje).toBe('La frecuencia debe ser mayor a 0 días.');
  });

  it('ante un error del servidor (500), guardar falla con el mensaje genérico', () => {
    let mensaje: string | undefined;
    servicio.guardar(7).subscribe({ error: (fallo: Error) => (mensaje = fallo.message) });

    backend
      .expectOne(RUTAS_API.frecuenciaNotificaciones)
      .flush({ message: 'NullReferenceException' }, { status: 500, statusText: 'Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_GUARDAR_FRECUENCIA);
  });
});
