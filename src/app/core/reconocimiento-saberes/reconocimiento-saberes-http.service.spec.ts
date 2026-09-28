import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { ReconocimientoSaberesHttpService } from './reconocimiento-saberes-http.service';
import {
  MENSAJE_RECONOCIMIENTO_ENVIADO,
  MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE,
  SolicitudReconocimiento,
} from './reconocimiento-saberes.service';

const pdf = (nombre: string) => new File(['%PDF-1.7'], nombre, { type: 'application/pdf' });

const SOLICITUD: SolicitudReconocimiento = {
  idUsuario: 12,
  materiaIscgb: 'Programación I',
  comentario: 'La cursé en la UTN en 2024.',
  programaOtraInstitucion: pdf('programa.pdf'),
  analitico: pdf('analitico.pdf'),
};

describe('ReconocimientoSaberesHttpService', () => {
  let servicio: ReconocimientoSaberesHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReconocimientoSaberesHttpService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    servicio = TestBed.inject(ReconocimientoSaberesHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('manda los dos PDF y la materia por multipart', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe((m) => (mensaje = m));

    const pedido = backend.expectOne(RUTAS_API.reconocimientoSaberes);
    const cuerpo = pedido.request.body as FormData;
    expect(pedido.request.method).toBe('POST');
    expect(cuerpo.get('idUsuario')).toBe('12');
    expect(cuerpo.get('materiaIscgb')).toBe('Programación I');
    expect(cuerpo.get('comentario')).toBe('La cursé en la UTN en 2024.');
    expect((cuerpo.get('programaOtraInstitucion') as File).name).toBe('programa.pdf');
    expect((cuerpo.get('analitico') as File).name).toBe('analitico.pdf');

    pedido.flush({});
    expect(mensaje).toBe(MENSAJE_RECONOCIMIENTO_ENVIADO);
  });

  it('si el backend todavía no tiene el endpoint lo dice, no finge un error de red', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.reconocimientoSaberes)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(mensaje).toBe(MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE);
  });
});
