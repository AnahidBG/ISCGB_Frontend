import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { ContratosHttpService } from './contratos-http.service';
import { MENSAJE_ERROR_CARGAR_CONTRATO } from './contratos.service';
import { ContratoAlumno } from './modelos/contrato-alumno';

describe('ContratosHttpService', () => {
  let servicio: ContratosHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContratosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ContratosHttpService);
    backend = TestBed.inject(HttpTestingController);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    backend.verify();
    vi.restoreAllMocks();
  });

  it('carga el contrato en multipart y un 500 da el mensaje genérico', () => {
    const archivo = new File(['%PDF-1.4'], 'convenio.pdf', { type: 'application/pdf' });
    let error: string | undefined;
    servicio
      .cargar({ idUsuario: 15, nombre: 'Convenio Beca', archivo })
      .subscribe({ error: (e: Error) => (error = e.message) });

    const pedido = backend.expectOne(RUTAS_API.cargarContratoAlumno);
    expect(pedido.request.method).toBe('POST');
    const cuerpo = pedido.request.body as FormData;
    expect(cuerpo.get('idUsuario')).toBe('15');
    expect(cuerpo.get('nombre')).toBe('Convenio Beca');
    expect(cuerpo.get('archivo')).toBe(archivo);
    pedido.flush(null, { status: 500, statusText: 'Error' });

    expect(error).toBe(MENSAJE_ERROR_CARGAR_CONTRATO);
  });

  it('lee los contratos del alumno con la fecha sin zona, del más nuevo al más viejo, y descarta los ilegibles', () => {
    let contratos: ContratoAlumno[] = [];
    servicio.misContratos().subscribe((c) => (contratos = c));

    backend.expectOne(RUTAS_API.misContratos).flush([
      { idContrato: 1, nombre: 'Convenio 2025', fechaCarga: '2025-03-10T10:00:00' },
      { idContrato: 2, nombre: 'Convenio 2026', fechaCarga: '2026-03-12T09:30:00' },
      { idContrato: 0, nombre: 'Sin id', fechaCarga: '2026-03-12T09:30:00' },
    ]);

    expect(contratos.map((c) => c.idContrato)).toEqual([2, 1]);
    expect(contratos[0].fechaCarga).toEqual(new Date(2026, 2, 12, 9, 30));
  });
});
