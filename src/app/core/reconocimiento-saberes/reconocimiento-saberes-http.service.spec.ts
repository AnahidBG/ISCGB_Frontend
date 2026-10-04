import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RUTAS_API } from '../configuracion/api';
import { ReconocimientoSaberesHttpService } from './reconocimiento-saberes-http.service';
import {
  MENSAJE_ADJUNTO_NO_ENCONTRADO,
  MENSAJE_ERROR_RECONOCIMIENTO,
  MENSAJE_ERROR_SOLICITUDES,
  MENSAJE_RECONOCIMIENTO_ENVIADO,
  MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE,
  SolicitudReconocimiento,
} from './reconocimiento-saberes.service';

const pdf = (nombre: string) => new File(['%PDF-1.7'], nombre, { type: 'application/pdf' });

const SOLICITUD: SolicitudReconocimiento = {
  idMateria: 14,
  comentario: 'La cursé en la UTN en 2024.',
  programaPdf: pdf('programa.pdf'),
  analiticoPdf: pdf('analitico.pdf'),
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

  it('manda SolicitudReconocimientoDto por multipart a /solicitar', () => {
    servicio.enviar(SOLICITUD).subscribe();

    const pedido = backend.expectOne(RUTAS_API.solicitarReconocimiento);
    const cuerpo = pedido.request.body as FormData;
    expect(pedido.request.method).toBe('POST');
    expect(cuerpo.get('idMateria')).toBe('14');
    expect(cuerpo.get('comentario')).toBe('La cursé en la UTN en 2024.');
    expect((cuerpo.get('programaPdf') as File).name).toBe('programa.pdf');
    expect((cuerpo.get('analiticoPdf') as File).name).toBe('analitico.pdf');
    pedido.flush({ mensaje: 'ok' });
  });

  it('no manda el id del alumno ni la materia como texto: el backend saca al alumno del token', () => {
    servicio.enviar(SOLICITUD).subscribe();

    const cuerpo = backend.expectOne(RUTAS_API.solicitarReconocimiento).request.body as FormData;
    expect(cuerpo.has('idUsuario')).toBe(false);
    expect(cuerpo.has('materiaIscgb')).toBe(false);
  });

  it('sin comentario no manda el campo', () => {
    servicio.enviar({ ...SOLICITUD, comentario: null }).subscribe();

    const pedido = backend.expectOne(RUTAS_API.solicitarReconocimiento);
    expect((pedido.request.body as FormData).has('comentario')).toBe(false);
    pedido.flush({ mensaje: 'ok' });
  });

  it('devuelve el `mensaje` del backend (en español, no `message`)', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe((m) => (mensaje = m));

    backend
      .expectOne(RUTAS_API.solicitarReconocimiento)
      .flush({ mensaje: 'Solicitud enviada a Secretaría/Preceptoria con éxito.' });

    expect(mensaje).toBe('Solicitud enviada a Secretaría/Preceptoria con éxito.');
  });

  it('si el backend responde 200 sin mensaje, usa el propio', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe((m) => (mensaje = m));

    backend.expectOne(RUTAS_API.solicitarReconocimiento).flush({});

    expect(mensaje).toBe(MENSAJE_RECONOCIMIENTO_ENVIADO);
  });

  it('un 400 muestra el texto del backend (viene como string suelto)', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.solicitarReconocimiento)
      .flush('Ambos archivos deben ser formato PDF y pesar un máximo de 10 MB.', {
        status: 400,
        statusText: 'Bad Request',
      });

    expect(mensaje).toBe('Ambos archivos deben ser formato PDF y pesar un máximo de 10 MB.');
  });

  it('si la ruta no existe lo dice, no finge un error de red', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.solicitarReconocimiento)
      .flush(null, { status: 404, statusText: 'Not Found' });

    expect(mensaje).toBe(MENSAJE_RECONOCIMIENTO_NO_DISPONIBLE);
  });

  it('un 500 da el mensaje genérico', () => {
    let mensaje = '';
    servicio.enviar(SOLICITUD).subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.solicitarReconocimiento)
      .flush('boom', { status: 500, statusText: 'Server Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_RECONOCIMIENTO);
  });
});

describe('ReconocimientoSaberesHttpService: bandeja de Secretaría', () => {
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

  it('traduce cada solicitud a un modelo limpio', () => {
    let solicitudes: unknown = null;
    servicio.listarPendientes().subscribe((s) => (solicitudes = s));

    backend.expectOne(RUTAS_API.reconocimientosPendientes).flush([
      {
        idSolicitud: 5,
        alumnoNombreCompleto: 'Gómez, María',
        dni: '12345678',
        materiaSolicitada: 'Didáctica General',
        comentario: '  La cursé en la UTN.  ',
        urlProgramaPdf: '/api/ReconocimientoSaberes/5/programa',
        urlAnaliticoPdf: '/api/ReconocimientoSaberes/5/analitico',
      },
      {
        idSolicitud: 6,
        alumnoNombreCompleto: ', ',
        dni: null,
        materiaSolicitada: 'Pedagogía',
        comentario: '   ',
        urlProgramaPdf: '/api/ReconocimientoSaberes/6/programa',
        urlAnaliticoPdf: '/api/ReconocimientoSaberes/6/analitico',
      },
    ]);

    expect(solicitudes).toEqual([
      {
        idSolicitud: 5,
        alumno: 'Gómez, María',
        dni: '12345678',
        materia: 'Didáctica General',
        comentario: 'La cursé en la UTN.',
      },
      {
        idSolicitud: 6,
        alumno: 'Alumno sin nombre cargado',
        dni: '',
        materia: 'Pedagogía',
        comentario: null,
      },
    ]);
  });

  it('si falla, da un mensaje legible', () => {
    let mensaje = '';
    servicio.listarPendientes().subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.reconocimientosPendientes)
      .flush(null, { status: 500, statusText: 'Server Error' });

    expect(mensaje).toBe(MENSAJE_ERROR_SOLICITUDES);
  });

  it('cada PDF se pide como blob, con el token (no con un enlace suelto)', () => {
    let archivo: Blob | null = null;
    servicio.descargarAdjunto(5, 'analitico').subscribe((a) => (archivo = a));

    const pedido = backend.expectOne(RUTAS_API.adjuntoReconocimiento(5, 'analitico'));
    expect(pedido.request.responseType).toBe('blob');
    pedido.flush(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));

    expect(archivo).not.toBeNull();
  });

  it('si el PDF no está en el servidor, lo dice', () => {
    let mensaje = '';
    servicio
      .descargarAdjunto(5, 'programa')
      .subscribe({ error: (e: Error) => (mensaje = e.message) });

    backend
      .expectOne(RUTAS_API.adjuntoReconocimiento(5, 'programa'))
      .flush(new Blob(['No se encontró el programa de la solicitud.']), {
        status: 404,
        statusText: 'Not Found',
      });

    expect(mensaje).toBe(MENSAJE_ADJUNTO_NO_ENCONTRADO);
  });
});
