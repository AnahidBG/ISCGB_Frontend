import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SIN_CARGA_GLOBAL } from '../carga/carga.interceptor';
import { RUTAS_API } from '../configuracion/api';
import { JustificativosHttpService } from './justificativos-http.service';

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
});
