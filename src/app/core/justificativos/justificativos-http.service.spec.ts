import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { JustificativosHttpService } from './justificativos-http.service';
import { MENSAJE_ERROR_MIS_JUSTIFICATIVOS } from './justificativos.service';
import { JustificativoPropio } from './modelos/justificativo-propio';

describe('JustificativosHttpService', () => {
  let servicio: JustificativosHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JustificativosHttpService, provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(JustificativosHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('listarPendientes', () => {
    it('en segundo plano el pedido lleva SIN_CARGA_GLOBAL', () => {
      servicio.listarPendientes({ enSegundoPlano: true }).subscribe();

      const pedido = backend.expectOne(RUTAS_API.justificativosPendientes);
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush([]);
    });

    it('sin la opción el pedido NO lleva SIN_CARGA_GLOBAL (el velo sigue igual)', () => {
      servicio.listarPendientes().subscribe();

      const pedido = backend.expectOne(RUTAS_API.justificativosPendientes);
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
      pedido.flush([]);
    });
  });

  describe('listarDeUsuario', () => {
    it('desenvuelve `data` y traduce cada justificativo con sus fechas', () => {
      let lista: JustificativoPropio[] = [];
      servicio.listarDeUsuario(7).subscribe((j) => (lista = j));

      backend.expectOne(RUTAS_API.justificativosDeUsuario(7)).flush({
        nombreUsuario: 'Ana Pérez',
        data: [
          {
            idJustificativo: 3,
            tipoInasistencia: 'Enfermedad',
            rutaArchivo: '/uploads/justificativos/x.pdf',
            notaAdicional: '  Gripe  ',
            fechaCarga: '2026-10-02T09:30:00',
            estado: 'Aprobado',
            fechaInasistenciaInicio: '2026-09-29T00:00:00',
            fechaInasistenciaFin: '2026-09-30T00:00:00',
            idUsuarioAuditor: 4,
          },
          {
            idJustificativo: 4,
            tipoInasistencia: null,
            rutaArchivo: null,
            notaAdicional: '   ',
            fechaCarga: '2026-10-03T10:00:00',
            estado: null,
            fechaInasistenciaInicio: null,
            fechaInasistenciaFin: null,
            idUsuarioAuditor: null,
          },
        ],
      });

      expect(lista).toHaveLength(2);
      expect(lista[0]).toEqual({
        idJustificativo: 3,
        tipoInasistencia: 'Enfermedad',
        rutaArchivo: '/uploads/justificativos/x.pdf',
        notaAdicional: 'Gripe',
        fechaCarga: new Date('2026-10-02T09:30:00'),
        estado: 'Aprobado',
        fechaInicio: new Date('2026-09-29T00:00:00'),
        fechaFin: new Date('2026-09-30T00:00:00'),
        revisado: true,
      });
      expect(lista[1].tipoInasistencia).toBe('Sin motivo cargado');
      expect(lista[1].notaAdicional).toBeNull();
      expect(lista[1].fechaInicio).toBeNull();
      expect(lista[1].revisado).toBe(false);
    });

    it('sin justificativos el backend manda `data: []` y un `message`: es una lista vacía', () => {
      let lista: JustificativoPropio[] | null = null;
      servicio.listarDeUsuario(7).subscribe((j) => (lista = j));

      backend.expectOne(RUTAS_API.justificativosDeUsuario(7)).flush({
        nombreUsuario: 'Ana Pérez',
        message: 'El usuario no tiene justificativos presentados.',
        data: [],
      });

      expect(lista).toEqual([]);
    });

    it('si falla, da un mensaje legible', () => {
      let mensaje = '';
      servicio.listarDeUsuario(7).subscribe({ error: (e: Error) => (mensaje = e.message) });

      backend
        .expectOne(RUTAS_API.justificativosDeUsuario(7))
        .flush(null, { status: 500, statusText: 'Server Error' });

      expect(mensaje).toBe(MENSAJE_ERROR_MIS_JUSTIFICATIVOS);
    });
  });
});
