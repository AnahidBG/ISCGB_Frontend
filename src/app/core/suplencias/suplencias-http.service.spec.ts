import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { ResultadoSuplencia } from './modelos/suplencia';
import { SuplenciasHttpService } from './suplencias-http.service';
import { MENSAJE_ERROR_SUPLENCIA } from './suplencias.service';

describe('SuplenciasHttpService', () => {
  let servicio: SuplenciasHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SuplenciasHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SuplenciasHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  it('asignar manda las fechas sin zona y lee cómo quedó la cuenta', () => {
    let resultado: ResultadoSuplencia | undefined;
    servicio
      .asignar({ idDocente: 8, desde: '2026-11-02', hasta: null })
      .subscribe((r) => (resultado = r));

    const pedido = backend.expectOne(RUTAS_API.suplenciaDocente(8));
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.url).toContain('/api/Docente/docentes/8/suplencia');
    expect(pedido.request.body).toEqual({
      esSuplente: true,
      fechaInicio: '2026-11-02T00:00:00',
      fechaFin: null,
    });
    pedido.flush({
      message: 'Suplencia y permisos activados.',
      esSuplente: true,
      estadoUsuario: true,
    });

    expect(resultado).toEqual({ esSuplente: true, cuentaActiva: true });
  });

  it('dar de baja manda esSuplente en false y avisa si la cuenta quedó inactiva', () => {
    let resultado: ResultadoSuplencia | undefined;
    servicio.darDeBaja(8).subscribe((r) => (resultado = r));

    const pedido = backend.expectOne(RUTAS_API.suplenciaDocente(8));
    expect(pedido.request.body).toEqual({ esSuplente: false, fechaInicio: null, fechaFin: null });
    pedido.flush({ message: 'Baja procesada.', esSuplente: false, estadoUsuario: false });

    expect(resultado).toEqual({ esSuplente: false, cuentaActiva: false });
  });

  it('un 404 del controlador muestra su mensaje y un 500 el genérico', () => {
    let mensaje404: string | undefined;
    let mensaje500: string | undefined;
    servicio.darDeBaja(99).subscribe({ error: (e: Error) => (mensaje404 = e.message) });
    servicio.darDeBaja(8).subscribe({ error: (e: Error) => (mensaje500 = e.message) });

    backend
      .expectOne(RUTAS_API.suplenciaDocente(99))
      .flush(
        { message: 'No se encontró el registro del docente.' },
        { status: 404, statusText: 'Not Found' },
      );
    backend
      .expectOne(RUTAS_API.suplenciaDocente(8))
      .flush(null, { status: 500, statusText: 'Error' });

    expect(mensaje404).toBe('No se encontró el registro del docente.');
    expect(mensaje500).toBe(MENSAJE_ERROR_SUPLENCIA);
  });
});
