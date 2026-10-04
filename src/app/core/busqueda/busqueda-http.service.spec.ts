import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { BusquedaHttpService } from './busqueda-http.service';
import { MENSAJE_ERROR_BUSQUEDA } from './busqueda.service';
import { ResultadoBusqueda } from './modelos/resultado-busqueda';

describe('BusquedaHttpService', () => {
  let servicio: BusquedaHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BusquedaHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(BusquedaHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('traduce los tipos del backend: "Docente" es cualquier persona, "Documento" es un justificativo', () => {
    let resultados: ResultadoBusqueda[] = [];
    servicio.buscar('ana').subscribe((r) => (resultados = r));

    backend.expectOne(RUTAS_API.busquedaGlobal('ana')).flush({
      cantidad: 3,
      data: [
        { tipo: 'Docente', titulo: 'Ana Pérez', subtitulo: 'Legajo/DNI: 123', idReferencia: 4 },
        { tipo: 'Materia', titulo: 'Análisis I', subtitulo: 'Materia del sistema', idReferencia: 9 },
        { tipo: 'Documento', titulo: 'Enfermedad', subtitulo: 'Estado: Pendiente', idReferencia: 2 },
      ],
    });

    expect(resultados).toEqual([
      { tipo: 'persona', titulo: 'Ana Pérez', detalle: 'Legajo/DNI: 123', idReferencia: 4 },
      { tipo: 'materia', titulo: 'Análisis I', detalle: null, idReferencia: 9 },
      { tipo: 'justificativo', titulo: 'Enfermedad', detalle: 'Estado: Pendiente', idReferencia: 2 },
    ]);
  });

  it('descarta los tipos que no conoce en vez de inventarles un enlace', () => {
    let resultados: ResultadoBusqueda[] = [];
    servicio.buscar('ana').subscribe((r) => (resultados = r));

    backend.expectOne(RUTAS_API.busquedaGlobal('ana')).flush({
      cantidad: 1,
      data: [{ tipo: 'Examen', titulo: 'Final', subtitulo: null, idReferencia: 1 }],
    });

    expect(resultados).toEqual([]);
  });

  it('con menos de 2 letras no pide nada (el backend devolvería vacío igual)', () => {
    let resultados: ResultadoBusqueda[] | null = null;
    servicio.buscar(' a ').subscribe((r) => (resultados = r));

    backend.expectNone(() => true);
    expect(resultados).toEqual([]);
  });

  it('manda el término sin espacios de más y codificado', () => {
    servicio.buscar('  María José ').subscribe();

    const pedido = backend.expectOne(RUTAS_API.busquedaGlobal('María José'));
    expect(pedido.request.urlWithParams).toContain('termino=Mar%C3%ADa%20Jos%C3%A9');
    pedido.flush({ cantidad: 0, data: [] });
  });

  it('si falla, da un mensaje legible', () => {
    let mensaje = '';
    servicio.buscar('ana').subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.busquedaGlobal('ana'))
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_BUSQUEDA);
  });
});
