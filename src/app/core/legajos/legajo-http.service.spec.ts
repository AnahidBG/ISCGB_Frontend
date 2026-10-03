import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { LegajoHttpService } from './legajo-http.service';

const ID_USUARIO = 7;

describe('LegajoHttpService: pedidos de la campana en segundo plano', () => {
  let servicio: LegajoHttpService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LegajoHttpService,
        { provide: AuthService, useValue: { sesion: () => ({ idUsuario: ID_USUARIO }) } },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    servicio = TestBed.inject(LegajoHttpService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  describe('obtenerLegajoPropio (1 pedido)', () => {
    it('en segundo plano lleva SIN_CARGA_GLOBAL', () => {
      servicio.obtenerLegajoPropio({ enSegundoPlano: true }).subscribe();

      const pedido = backend.expectOne(RUTAS_API.legajosPorUsuario(ID_USUARIO));
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush({ nombreCompleto: 'x', documentos: [] });
    });

    it('sin la opción NO lo lleva', () => {
      servicio.obtenerLegajoPropio().subscribe();

      const pedido = backend.expectOne(RUTAS_API.legajosPorUsuario(ID_USUARIO));
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
      pedido.flush({ nombreCompleto: 'x', documentos: [] });
    });
  });

  describe('documentosRequeridos (1 pedido)', () => {
    it('en segundo plano lleva SIN_CARGA_GLOBAL', () => {
      servicio.documentosRequeridos(3, { enSegundoPlano: true }).subscribe();

      const pedido = backend.expectOne(RUTAS_API.documentosRequeridosPorRol(3));
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
      pedido.flush({ rol: 'Docente', documentos: [] });
    });

    it('sin la opción NO lo lleva', () => {
      servicio.documentosRequeridos(3).subscribe();

      const pedido = backend.expectOne(RUTAS_API.documentosRequeridosPorRol(3));
      expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
      pedido.flush({ rol: 'Docente', documentos: [] });
    });
  });

  describe('obtenerResumenUsuarios (se arma en el cliente: 1 pedido a resumen-estado)', () => {
    it('en segundo plano TODOS sus pedidos llevan SIN_CARGA_GLOBAL', () => {
      servicio.obtenerResumenUsuarios({ enSegundoPlano: true }).subscribe();

      const pedidos = backend.match(() => true);
      expect(pedidos).toHaveLength(1);
      expect(pedidos[0].request.url).toBe(RUTAS_API.legajosResumenEstado);
      pedidos.forEach((pedido) => {
        expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(true);
        pedido.flush([]);
      });
    });

    it('sin la opción NINGUNO lo lleva', () => {
      servicio.obtenerResumenUsuarios().subscribe();

      const pedidos = backend.match(() => true);
      expect(pedidos).toHaveLength(1);
      pedidos.forEach((pedido) => {
        expect(pedido.request.context.get(SIN_CARGA_GLOBAL)).toBe(false);
        pedido.flush([]);
      });
    });
  });
});
