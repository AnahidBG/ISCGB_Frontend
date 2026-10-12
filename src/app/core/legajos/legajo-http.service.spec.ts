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

describe('LegajoHttpService: campos del backend que no se pierden al mapear', () => {
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

  const legajoApi = (auditor: string) => ({
    idLegajo: 1,
    idUsuario: ID_USUARIO,
    tipoDocumento: 'DNI',
    rutaArchivo: '/uploads/legajos/x.pdf',
    fechaCarga: '2026-10-01T10:00:00',
    fechaVencimiento: null,
    estado: 'Rechazado',
    presentadoFisico: true,
    comentario: 'Ilegible',
    auditor,
  });

  it('el legajo trae quién lo revisó', () => {
    let auditor: string | null | undefined;
    servicio.obtenerLegajoDeUsuario(ID_USUARIO).subscribe((docs) => (auditor = docs[0].auditor));

    backend
      .expectOne(RUTAS_API.legajosPorUsuario(ID_USUARIO))
      .flush({ nombreCompleto: 'x', documentos: [legajoApi('Sergio Secretario')] });

    expect(auditor).toBe('Sergio Secretario');
  });

  it('"Sin auditor asignado" del backend se traduce a null: nadie lo revisó todavía', () => {
    let auditor: string | null | undefined;
    servicio.obtenerLegajoDeUsuario(ID_USUARIO).subscribe((docs) => (auditor = docs[0].auditor));

    backend
      .expectOne(RUTAS_API.legajosPorUsuario(ID_USUARIO))
      .flush({ nombreCompleto: 'x', documentos: [legajoApi('Sin auditor asignado')] });

    expect(auditor).toBeNull();
  });

  it('los pendientes del instituto conservan la ruta del PDF', () => {
    let ruta: string | null | undefined;
    servicio.listarParaRevision().subscribe((docs) => (ruta = docs[0].rutaArchivo));

    backend.expectOne(RUTAS_API.legajosPendientes).flush([
      {
        idLegajo: 3,
        nombreUsuario: 'Ana Gómez',
        tipoDocumento: 'DNI',
        rutaArchivo: '/uploads/legajos/ISCGB_AnaGomez_DNI.pdf',
        fechaCarga: '2026-10-01T10:00:00',
        presentadoFisico: false,
      },
    ]);

    expect(ruta).toBe('/uploads/legajos/ISCGB_AnaGomez_DNI.pdf');
  });

  it('la subida no manda presentadoFisico: el backend ya no lo lee', () => {
    servicio
      .subirDocumento({
        idUsuario: ID_USUARIO,
        idTipoDoc: 4,
        fechaVencimiento: null,
        archivo: new File(['%PDF-1.7'], 'dni.pdf', { type: 'application/pdf' }),
      })
      .subscribe();

    const pedido = backend.expectOne(RUTAS_API.subirLegajo);
    const cuerpo = pedido.request.body as FormData;
    expect(cuerpo.has('presentadoFisico')).toBe(false);
    expect(cuerpo.get('idTipoDoc')).toBe('4');
    pedido.flush({ message: 'ok', idLegajo: 1, ruta: '/uploads/legajos/x.pdf' });
  });
});

describe('LegajoHttpService: la auditoría guarda el veredicto, el comentario y la entrega en papel', () => {
  const ID_LEGAJO = 5;
  const ID_AUDITOR = 9;

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

  // El backend asigna estado, comentario y presentadoFisico en cada auditoría:
  // lo que no llegue queda en null. Por eso viajan los tres siempre, y la
  // casilla destildada va como `false`, nunca ausente.
  it.each([
    ['con la casilla tildada y un motivo', 'Rechazado', 'Documento incompleto', true],
    ['con la casilla sin tildar y sin comentario', 'Aprobado', null, false],
  ] as const)('%s', (_caso, veredicto, comentario, presentadoFisico) => {
    servicio.auditar(ID_LEGAJO, veredicto, ID_AUDITOR, comentario, presentadoFisico).subscribe();

    const pedido = backend.expectOne(RUTAS_API.auditarLegajo(ID_LEGAJO, ID_AUDITOR));
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ estado: veredicto, comentario, presentadoFisico });
    pedido.flush({ message: 'ok', idLegajo: ID_LEGAJO, estado: veredicto, presentadoFisico });
  });
});
