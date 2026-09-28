import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { CertificadosHttpService } from './certificados-http.service';
import { MENSAJE_DATOS_INCOMPLETOS, MENSAJE_NO_ES_ALUMNO } from './certificados.service';

describe('CertificadosHttpService', () => {
  let servicio: CertificadosHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CertificadosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(CertificadosHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('pide cada variante a su endpoint y como archivo (blob)', () => {
    servicio.descargar('regular').subscribe();
    servicio.descargar('regular-con-horario').subscribe();

    const sinHorario = backend.expectOne(RUTAS_API.certificadoAlumnoRegular);
    const conHorario = backend.expectOne(RUTAS_API.certificadoAlumnoRegularConHorario);
    expect(sinHorario.request.responseType).toBe('blob');
    expect(conHorario.request.responseType).toBe('blob');

    sinHorario.flush(new Blob(['%PDF-']));
    conHorario.flush(new Blob(['%PDF-']));
  });

  it('400 = datos personales incompletos', () => {
    let mensaje = '';
    servicio.descargar('regular').subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.certificadoAlumnoRegular)
      .flush(new Blob(['{}']), { status: 400, statusText: 'Bad Request' });

    expect(mensaje).toBe(MENSAJE_DATOS_INCOMPLETOS);
  });

  it('404 = el usuario no es alumno', () => {
    let mensaje = '';
    servicio.descargar('regular').subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.certificadoAlumnoRegular)
      .flush(new Blob(['{}']), { status: 404, statusText: 'Not Found' });

    expect(mensaje).toBe(MENSAJE_NO_ES_ALUMNO);
  });
});
