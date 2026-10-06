import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RolApi } from '../../../core/auth/modelos/rol';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { DocumentoLegajo } from '../../../core/legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { UsuarioDetalle } from '../../../core/usuarios/modelos/usuario-detalle';
import { UsuariosService } from '../../../core/usuarios/usuarios.service';
import { MisDocumentos } from './mis-documentos';

const ID_REVISADO = 20;

function sesionCon(idUsuario: number, rolesConId: RolApi[]): Sesion {
  return {
    token: 't',
    idUsuario,
    nombreCompleto: 'Sergio Secretario',
    dni: '12345678',
    email: 'sergio@ejemplo.com',
    roles: rolesConId.map((rol) => rol.nombreRol ?? ''),
    rolesConId,
    venceEl: new Date(Date.now() + 60_000),
  };
}

const SECRETARIO = sesionCon(2, [{ idRol: 2, nombreRol: 'Secretario' }]);
const DIRECTOR = sesionCon(1, [{ idRol: 1, nombreRol: 'Director' }]);
const DOCENTE = sesionCon(ID_REVISADO, [{ idRol: 3, nombreRol: 'Docente' }]);
const ALUMNO = sesionCon(ID_REVISADO, [{ idRol: 4, nombreRol: 'Alumno' }]);

const REQUERIDOS: DocumentoRequerido[] = [
  { idTipoDoc: 1, nombreDocumento: 'DNI', obligatorio: true, anual: false },
  { idTipoDoc: 2, nombreDocumento: 'Título', obligatorio: true, anual: false },
  { idTipoDoc: 3, nombreDocumento: 'Apto médico', obligatorio: true, anual: true },
];

/** El DNI ya está en papel en Secretaría; el Título no. El Apto médico falta. */
const LEGAJO: DocumentoLegajo[] = [
  {
    id: 101,
    nombre: 'DNI',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-10-01T10:00:00'),
    comentario: null,
    fechaVencimiento: null,
    rutaArchivo: '/uploads/legajos/dni.pdf',
    presentadoFisico: true,
  },
  {
    id: 102,
    nombre: 'Título',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-10-02T10:00:00'),
    comentario: null,
    fechaVencimiento: null,
    rutaArchivo: '/uploads/legajos/titulo.pdf',
    presentadoFisico: false,
  },
];

const PERSONA_REVISADA: UsuarioDetalle = {
  idUsuario: ID_REVISADO,
  dni: '30111222',
  nombre: 'Ana',
  apellido: 'Gómez',
  email: 'ana@ejemplo.com',
  telefono: null,
  telefonoEmergencia: null,
  lugarNacimiento: null,
  contactoEmergencia: null,
  direccion: null,
  idProvincia: null,
  fechaNac: null,
  estadoUsuario: true,
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
};

/** Los argumentos de cada llamada a `LegajoService.auditar`. */
let auditorias: unknown[][];

/**
 * `idUsuarioEnUrl`: con id es `legajo/usuario/:idUsuario` (revisión de
 * Secretaría o Dirección); sin id es `legajo/mis-documentos` (el propio).
 */
async function montar(
  sesion: Sesion,
  idUsuarioEnUrl: number | null,
): Promise<ComponentFixture<MisDocumentos>> {
  const parametros: Record<string, string> =
    idUsuarioEnUrl === null ? {} : { idUsuario: String(idUsuarioEnUrl) };
  auditorias = [];

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          paramMap: of(convertToParamMap(parametros)),
          // Lo lee `EstructuraPanel` para el cartel de acceso denegado.
          queryParamMap: of(convertToParamMap({})),
        },
      },
      { provide: AuthService, useValue: { sesion: signal(sesion), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
      },
      {
        provide: UsuariosService,
        useValue: { obtener: (): Observable<UsuarioDetalle> => of(PERSONA_REVISADA) },
      },
      {
        provide: LegajoService,
        useValue: {
          obtenerLegajoPropio: (): Observable<DocumentoLegajo[]> => of(LEGAJO),
          obtenerLegajoDeUsuario: (): Observable<DocumentoLegajo[]> => of(LEGAJO),
          documentosRequeridos: (): Observable<DocumentoRequerido[]> => of(REQUERIDOS),
          auditar: (...argumentos: unknown[]): Observable<void> => {
            auditorias.push(argumentos);
            return of(undefined);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(MisDocumentos);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<MisDocumentos>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('MisDocumentos: "Presentado físicamente" lo marca quien revisa', () => {
  function casilla(fixture: ComponentFixture<MisDocumentos>, idLegajo: number): HTMLInputElement | null {
    return raiz(fixture).querySelector(`#presentado-fisico-${idLegajo}`);
  }

  function casillas(fixture: ComponentFixture<MisDocumentos>): NodeListOf<HTMLInputElement> {
    return raiz(fixture).querySelectorAll('input[type="checkbox"]');
  }

  it.each([
    ['Secretaría', SECRETARIO],
    ['Dirección', DIRECTOR],
  ])('%s, revisando un legajo ajeno, ve la casilla en cada documento subido', async (_quien, sesion) => {
    const fixture = await montar(sesion, ID_REVISADO);

    // Una por documento subido; el Apto médico, que falta, no tiene.
    expect(casillas(fixture)).toHaveLength(2);
    expect(raiz(fixture).querySelector('label[for="presentado-fisico-101"]')?.textContent).toContain(
      'Presentado físicamente',
    );
  });

  it('la casilla arranca con lo que el backend tiene guardado de cada documento', async () => {
    const fixture = await montar(SECRETARIO, ID_REVISADO);

    expect(casilla(fixture, 101)!.checked).toBe(true);
    expect(casilla(fixture, 102)!.checked).toBe(false);
  });

  it('quien revisa la puede tildar y destildar, documento por documento', async () => {
    const fixture = await montar(SECRETARIO, ID_REVISADO);
    expect(casilla(fixture, 102)!.disabled).toBe(false);

    casilla(fixture, 102)!.click();
    await fixture.whenStable();
    expect(casilla(fixture, 102)!.checked).toBe(true);

    casilla(fixture, 101)!.click();
    await fixture.whenStable();
    expect(casilla(fixture, 101)!.checked).toBe(false);
    // Tildar una no toca la otra.
    expect(casilla(fixture, 102)!.checked).toBe(true);
  });

  it('tildarla no manda nada al backend: por ahora vive solo en la pantalla', async () => {
    const fixture = await montar(SECRETARIO, ID_REVISADO);

    casilla(fixture, 102)!.click();
    await fixture.whenStable();

    expect(auditorias).toHaveLength(0);
  });

  it.each([
    ['el Docente', DOCENTE],
    ['el Alumno', ALUMNO],
  ])('%s, en su propio legajo, no ve casilla ni el aviso', async (_quien, sesion) => {
    const fixture = await montar(sesion, null);

    expect(casillas(fixture)).toHaveLength(0);
    expect(raiz(fixture).textContent).not.toContain('Presentado físicamente');
  });
});

describe('MisDocumentos: rechazar con los motivos de la institución', () => {
  /** La fila (`<li>`) del documento, buscada por su nombre. */
  function filaDe(fixture: ComponentFixture<MisDocumentos>, documento: string): HTMLElement {
    return Array.from(raiz(fixture).querySelectorAll('li')).find(
      (li) => li.querySelector('p')?.textContent?.trim() === documento,
    )!;
  }

  async function apretar(contenedor: HTMLElement, etiqueta: string, fixture: ComponentFixture<MisDocumentos>) {
    Array.from(contenedor.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === etiqueta)!
      .click();
    await fixture.whenStable();
  }

  async function marcar(contenedor: HTMLElement, motivo: string, fixture: ComponentFixture<MisDocumentos>) {
    Array.from(contenedor.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
      .find((c) => c.closest('label')?.textContent?.trim() === motivo)!
      .click();
    await fixture.whenStable();
  }

  it('"Confirmar rechazo" sin ningún motivo marcado no envía nada', async () => {
    const fixture = await montar(SECRETARIO, ID_REVISADO);
    await apretar(filaDe(fixture, 'DNI'), 'Rechazar', fixture);

    await apretar(filaDe(fixture, 'DNI'), 'Confirmar rechazo', fixture);

    expect(auditorias).toHaveLength(0);
    expect(filaDe(fixture, 'DNI').textContent).toContain('Marcá al menos un motivo');
  });

  it('el comentario del PUT lleva los motivos marcados y la aclaración', async () => {
    const fixture = await montar(SECRETARIO, ID_REVISADO);
    await apretar(filaDe(fixture, 'DNI'), 'Rechazar', fixture);

    await marcar(filaDe(fixture, 'DNI'), 'Dato de importancia ilegible', fixture);
    await marcar(filaDe(fixture, 'DNI'), 'No se encuentra en formato pdf', fixture);
    const aclaracion = filaDe(fixture, 'DNI').querySelector<HTMLTextAreaElement>('textarea')!;
    aclaracion.value = 'se escaneó como imagen';
    aclaracion.dispatchEvent(new Event('input'));
    await apretar(filaDe(fixture, 'DNI'), 'Confirmar rechazo', fixture);

    const comentario =
      'Dato de importancia ilegible; No se encuentra en formato pdf. Aclaración: se escaneó como imagen';
    expect(auditorias).toEqual([[101, 'Rechazado', SECRETARIO.idUsuario, comentario]]);
    // Lo mismo que va a ver la persona en su legajo.
    expect(filaDe(fixture, 'DNI').textContent).toContain(`Motivo del rechazo: ${comentario}`);
  });
});
