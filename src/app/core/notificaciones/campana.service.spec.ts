import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ID_ROL, ROLES } from '../auth/modelos/rol';
import { Sesion } from '../auth/modelos/sesion';
import { JustificativoPendiente } from '../justificativos/modelos/justificativo-pendiente';
import { JustificativosService } from '../justificativos/justificativos.service';
import { LegajoService } from '../legajos/legajo.service';
import { DocumentoLegajo } from '../legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../legajos/modelos/documento-requerido';
import { ResumenUsuarioLegajo } from '../legajos/modelos/resumen-usuario-legajo';
import { CampanaService } from './campana.service';

function sesionDe(idUsuario: number, roles: string[]): Sesion {
  return {
    token: 'x',
    idUsuario,
    nombreCompleto: 'Persona de prueba',
    dni: '1',
    email: 'a@b.c',
    roles,
    rolesConId: roles.map((nombreRol) => ({
      idRol: ID_ROL[nombreRol as keyof typeof ID_ROL],
      nombreRol,
    })),
    venceEl: new Date(Date.now() + 60_000),
  };
}

const DOCUMENTO_RECHAZADO: DocumentoLegajo = {
  id: 1,
  nombre: 'DNI',
  estado: 'Rechazado',
  fechaSubida: new Date('2026-09-01'),
  comentario: 'Borroso.',
  fechaVencimiento: null,
  presentadoFisico: false,
};

const JUSTIFICATIVO: JustificativoPendiente = {
  idJustificativo: 1,
  nombreDocente: 'Ana Pérez',
  tipoInasistencia: 'Enfermedad',
  rutaArchivo: null,
  fechaCarga: new Date('2026-09-01'),
};

const PERSONA: ResumenUsuarioLegajo = {
  idUsuario: 9,
  nombreCompleto: 'Juan Gómez',
  dni: '30111222',
  aprobados: 0,
  pendientes: 2,
  rechazados: 0,
  otros: 0,
  total: 2,
};

/** La campana es accesoria: nunca debe tapar la pantalla con el velo "Cargando…". */
const EN_SEGUNDO_PLANO = { enSegundoPlano: true };

describe('CampanaService', () => {
  const sesion = signal<Sesion | null>(null);

  let legajoPropio: () => Observable<DocumentoLegajo[]>;
  let requeridos: (idRol: number) => Observable<DocumentoRequerido[]>;
  let resumenUsuarios: () => Observable<ResumenUsuarioLegajo[]>;
  let pendientesJustificativos: () => Observable<JustificativoPendiente[]>;

  const llamadas = {
    legajoPropio: vi.fn(),
    requeridos: vi.fn(),
    resumenUsuarios: vi.fn(),
    justificativos: vi.fn(),
  };

  function servicio(): CampanaService {
    return TestBed.inject(CampanaService);
  }

  const totalDeLlamadas = () =>
    llamadas.legajoPropio.mock.calls.length +
    llamadas.requeridos.mock.calls.length +
    llamadas.resumenUsuarios.mock.calls.length +
    llamadas.justificativos.mock.calls.length;

  beforeEach(() => {
    sesion.set(null);
    Object.values(llamadas).forEach((fn) => fn.mockClear());

    legajoPropio = () => of([]);
    requeridos = () => of([]);
    resumenUsuarios = () => of([]);
    pendientesJustificativos = () => of([]);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { sesion: sesion.asReadonly() } },
        {
          provide: LegajoService,
          useValue: {
            obtenerLegajoPropio: (opciones?: unknown) => {
              llamadas.legajoPropio(opciones);
              return legajoPropio();
            },
            documentosRequeridos: (idRol: number, opciones?: unknown) => {
              llamadas.requeridos(idRol, opciones);
              return requeridos(idRol);
            },
            obtenerResumenUsuarios: (opciones?: unknown) => {
              llamadas.resumenUsuarios(opciones);
              return resumenUsuarios();
            },
          },
        },
        {
          provide: JustificativosService,
          useValue: {
            listarPendientes: (opciones?: unknown) => {
              llamadas.justificativos(opciones);
              return pendientesJustificativos();
            },
          },
        },
      ],
    });
  });

  it('arranca vacía', () => {
    expect(servicio().total()).toBe(0);
    expect(servicio().detalle()).toEqual([]);
  });

  describe('sesión de Alumno o Docente: las novedades de SU legajo', () => {
    it.each([ROLES.alumno, ROLES.docente])('con rol %s sale del legajo propio', (rol) => {
      sesion.set(sesionDe(1, [rol]));
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      requeridos = () =>
        of([{ idTipoDoc: 1, nombreDocumento: 'DNI', obligatorio: true, anual: false }]);

      servicio().refrescar();

      expect(llamadas.requeridos).toHaveBeenCalledWith(ID_ROL[rol], EN_SEGUNDO_PLANO);
      expect(servicio().total()).toBe(1);
      expect(servicio().detalle()).toEqual([
        {
          titulo: 'Rechazaron DNI',
          detalle: 'Borroso.',
          url: '/legajo/mis-documentos',
          tono: 'rechazado',
        },
      ]);
      expect(llamadas.resumenUsuarios).not.toHaveBeenCalled();
      expect(llamadas.justificativos).not.toHaveBeenCalled();
    });

    it('pide TODO en segundo plano para no disparar el velo global', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));

      servicio().refrescar();

      expect(llamadas.legajoPropio).toHaveBeenCalledWith(EN_SEGUNDO_PLANO);
      expect(llamadas.requeridos).toHaveBeenCalledWith(ID_ROL[ROLES.alumno], EN_SEGUNDO_PLANO);
    });

    it('el detalle trae la lista COMPLETA, sin el tope de 5 filas', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () =>
        of(
          [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
            ...DOCUMENTO_RECHAZADO,
            id,
            nombre: `Tipo ${id}`,
          })),
        );

      servicio().refrescar();

      expect(servicio().total()).toBe(8);
      expect(servicio().detalle()).toHaveLength(8);
    });

    it('si la sesión no trae el id del rol, no pide requeridos y arma lo que puede', () => {
      sesion.set({ ...sesionDe(1, [ROLES.docente]), rolesConId: undefined });
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);

      servicio().refrescar();

      expect(llamadas.requeridos).not.toHaveBeenCalled();
      expect(servicio().total()).toBe(1);
    });

    it('si fallan los requeridos igual avisa los rechazos', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      requeridos = () => throwError(() => new Error('500'));

      servicio().refrescar();

      expect(servicio().total()).toBe(1);
    });
  });

  describe('sesión de Secretario o Director: los pendientes del instituto', () => {
    it.each([ROLES.secretario, ROLES.director])(
      'con rol %s suma justificativos y legajos',
      (rol) => {
        sesion.set(sesionDe(2, [rol]));
        pendientesJustificativos = () => of([JUSTIFICATIVO]);
        resumenUsuarios = () => of([PERSONA]);

        servicio().refrescar();

        expect(servicio().total()).toBe(3);
        expect(servicio().detalle().map((n) => n.titulo)).toEqual([
          'Ana Pérez pidió justificar una inasistencia',
          'Juan Gómez',
        ]);
        expect(llamadas.legajoPropio).not.toHaveBeenCalled();
      },
    );

    it('pide las dos fuentes en segundo plano para no disparar el velo global', () => {
      sesion.set(sesionDe(2, [ROLES.secretario]));

      servicio().refrescar();

      expect(llamadas.justificativos).toHaveBeenCalledWith(EN_SEGUNDO_PLANO);
      expect(llamadas.resumenUsuarios).toHaveBeenCalledWith(EN_SEGUNDO_PLANO);
    });

    it('si falla una de las dos fuentes, muestra lo de la otra', () => {
      sesion.set(sesionDe(2, [ROLES.secretario]));
      pendientesJustificativos = () => throwError(() => new Error('500'));
      resumenUsuarios = () => of([PERSONA]);

      servicio().refrescar();

      expect(servicio().total()).toBe(2);
    });

    it('si fallan las dos, no pisa lo que ya tenía', () => {
      sesion.set(sesionDe(2, [ROLES.secretario]));
      resumenUsuarios = () => of([PERSONA]);
      servicio().refrescar();
      expect(servicio().total()).toBe(2);

      pendientesJustificativos = () => throwError(() => new Error('500'));
      resumenUsuarios = () => throwError(() => new Error('500'));

      expect(() => servicio().refrescar()).not.toThrow();
      expect(servicio().total()).toBe(2);
    });
  });

  describe('sesiones con mas de un rol', () => {
    it('manda el rol de mayor alcance: Director + Docente ve los pendientes del instituto', () => {
      sesion.set(sesionDe(3, [ROLES.docente, ROLES.director]));
      resumenUsuarios = () => of([PERSONA]);

      servicio().refrescar();

      expect(llamadas.resumenUsuarios).toHaveBeenCalledTimes(1);
      expect(llamadas.legajoPropio).not.toHaveBeenCalled();
      expect(servicio().total()).toBe(2);
    });
  });

  describe('sin sesión o sin rol reconocido', () => {
    it('sin sesión queda vacía y no llama a ningún servicio', () => {
      servicio().refrescar();

      expect(servicio().total()).toBe(0);
      expect(totalDeLlamadas()).toBe(0);
    });

    it('con un rol desconocido queda vacía y no llama a ningún servicio', () => {
      sesion.set({
        ...sesionDe(1, []),
        roles: ['Bedel'],
        rolesConId: [{ idRol: 9, nombreRol: 'Bedel' }],
      });

      servicio().refrescar();

      expect(servicio().total()).toBe(0);
      expect(servicio().detalle()).toEqual([]);
      expect(totalDeLlamadas()).toBe(0);
    });

    it('con un rol llamado como una propiedad de Object tampoco rompe', () => {
      sesion.set({ ...sesionDe(1, []), roles: ['constructor'] });

      expect(() => servicio().refrescar()).not.toThrow();
      expect(totalDeLlamadas()).toBe(0);
    });
  });

  describe('recarga', () => {
    it('mientras recarga conserva el último valor', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      servicio().refrescar();
      expect(servicio().total()).toBe(1);

      const enCurso = new Subject<DocumentoLegajo[]>();
      legajoPropio = () => enCurso;
      servicio().refrescar();

      expect(servicio().total()).toBe(1);
      expect(servicio().detalle()).toHaveLength(1);

      enCurso.next([]);
      enCurso.complete();

      expect(servicio().total()).toBe(0);
    });

    it('dos refrescos simultáneos disparan una sola carga', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      const enCurso = new Subject<DocumentoLegajo[]>();
      legajoPropio = () => enCurso;

      servicio().refrescar();
      servicio().refrescar();

      expect(llamadas.legajoPropio).toHaveBeenCalledTimes(1);

      enCurso.next([DOCUMENTO_RECHAZADO]);
      enCurso.complete();
      servicio().refrescar();

      expect(llamadas.legajoPropio).toHaveBeenCalledTimes(2);
    });

    it('si la carga falla, no lanza y la campana queda como estaba', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      servicio().refrescar();

      legajoPropio = () => throwError(() => new Error('500'));
      expect(() => servicio().refrescar()).not.toThrow();

      expect(servicio().total()).toBe(1);
    });

    it('si falla la primera carga queda vacía y se puede reintentar', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => throwError(() => new Error('500'));
      servicio().refrescar();
      expect(servicio().total()).toBe(0);

      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      servicio().refrescar();

      expect(servicio().total()).toBe(1);
    });
  });

  describe('cambio o cierre de sesión', () => {
    it('al cambiar el idUsuario se limpia: nunca se ven avisos de la sesión anterior', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      servicio().refrescar();
      expect(servicio().total()).toBe(1);

      sesion.set(sesionDe(2, [ROLES.alumno]));

      expect(servicio().total()).toBe(0);
      expect(servicio().detalle()).toEqual([]);
    });

    it('al cerrar la sesión se limpia', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => of([DOCUMENTO_RECHAZADO]);
      servicio().refrescar();

      sesion.set(null);

      expect(servicio().total()).toBe(0);
      expect(servicio().detalle()).toEqual([]);
    });

    it('lo que llega tarde de la sesión anterior se descarta', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      const tardia = new Subject<DocumentoLegajo[]>();
      legajoPropio = () => tardia;
      servicio().refrescar();

      sesion.set(sesionDe(2, [ROLES.alumno]));
      legajoPropio = () => of([]);
      servicio().refrescar();

      tardia.next([DOCUMENTO_RECHAZADO]);
      tardia.complete();

      expect(servicio().total()).toBe(0);
    });

    it('con otra sesión el refresco vuelve a cargar aunque haya uno en curso de la anterior', () => {
      sesion.set(sesionDe(1, [ROLES.alumno]));
      legajoPropio = () => new Subject<DocumentoLegajo[]>();
      servicio().refrescar();

      sesion.set(sesionDe(2, [ROLES.alumno]));
      servicio().refrescar();

      expect(llamadas.legajoPropio).toHaveBeenCalledTimes(2);
    });
  });
});
