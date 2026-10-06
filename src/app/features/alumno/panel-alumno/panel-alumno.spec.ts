import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { LegajoService, MENSAJE_ERROR_LEGAJO } from '../../../core/legajos/legajo.service';
import { DocumentoLegajo } from '../../../core/legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { PanelAlumno } from './panel-alumno';

const ALUMNO: Sesion = {
  token: 't',
  idUsuario: 20,
  nombreCompleto: 'Andrés Alumno',
  dni: '30111222',
  email: 'andres@ejemplo.com',
  roles: ['Alumno'],
  rolesConId: [{ idRol: 4, nombreRol: 'Alumno' }],
  venceEl: new Date(Date.now() + 60_000),
};

const REQUERIDOS: DocumentoRequerido[] = [
  { idTipoDoc: 1, nombreDocumento: 'DNI', obligatorio: true, anual: false },
  { idTipoDoc: 2, nombreDocumento: 'Título secundario', obligatorio: true, anual: false },
  { idTipoDoc: 3, nombreDocumento: 'Apto médico', obligatorio: true, anual: true },
  { idTipoDoc: 4, nombreDocumento: 'Curriculum', obligatorio: false, anual: false },
];

function documento(id: number, nombre: string, estado: string): DocumentoLegajo {
  return {
    id,
    nombre,
    estado,
    fechaSubida: new Date('2026-10-01T10:00:00'),
    comentario: null,
    fechaVencimiento: null,
    presentadoFisico: false,
  };
}

/** El legajo ya resuelto, o la función que lo pide (para simular carga, error y reintento). */
type FuenteLegajo = DocumentoLegajo[] | (() => Observable<DocumentoLegajo[]>);

async function montar(fuente: FuenteLegajo): Promise<ComponentFixture<PanelAlumno>> {
  const obtenerLegajoPropio = typeof fuente === 'function' ? fuente : () => of(fuente);

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { sesion: signal(ALUMNO), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: {
          total: signal(0),
          detalle: signal<NotificacionPanel[]>([]),
          refrescar: () => {},
        },
      },
      {
        provide: LegajoService,
        useValue: {
          obtenerLegajoPropio,
          documentosRequeridos: (): Observable<DocumentoRequerido[]> => of(REQUERIDOS),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PanelAlumno);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<PanelAlumno>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function tarjeta(fixture: ComponentFixture<PanelAlumno>): HTMLElement | null {
  return raiz(fixture).querySelector('app-documentacion-por-entregar');
}

function porEntregar(fixture: ComponentFixture<PanelAlumno>): (string | undefined)[] {
  return Array.from(tarjeta(fixture)?.querySelectorAll('li') ?? []).map((li) =>
    li.querySelector('span')?.textContent?.trim(),
  );
}

describe('PanelAlumno: documentación por entregar (SCRUM-150)', () => {
  it('muestra los obligatorios que nunca se subieron', async () => {
    const fixture = await montar([documento(101, 'DNI', 'Rechazado')]);

    // El DNI se subió (aunque esté rechazado) y el Curriculum no es obligatorio.
    expect(porEntregar(fixture)).toEqual(['Título secundario', 'Apto médico']);
  });

  it('con todo lo obligatorio cargado lo dice, en vez de listar', async () => {
    const fixture = await montar([
      documento(101, 'DNI', 'Aprobado'),
      documento(102, 'Título secundario', 'Pendiente'),
      documento(103, 'Apto médico', 'Aprobado'),
    ]);

    expect(tarjeta(fixture)?.textContent).toContain(
      'Ya cargaste toda la documentación obligatoria.',
    );
    expect(porEntregar(fixture)).toEqual([]);
  });

  it('con el legajo completo no muestra la tarjeta: eso ya lo dice el cartel', async () => {
    const fixture = await montar([
      documento(101, 'DNI', 'Aprobado'),
      documento(102, 'Título secundario', 'Aprobado'),
      documento(103, 'Apto médico', 'Aprobado'),
    ]);

    expect(tarjeta(fixture)).toBeNull();
  });

  it('mientras el legajo carga lo dice, y el mapa del trámite espera', async () => {
    const fixture = await montar(() => NEVER);

    expect(tarjeta(fixture)?.textContent).toContain('Cargando tu documentación…');
    // Sin esto el mapa diría "0 de 0" y la tabla "no cargaste nada" antes de saberlo.
    expect(raiz(fixture).querySelector('app-progreso-tramite')).toBeNull();
    expect(raiz(fixture).querySelector('table')).toBeNull();
  });

  it('si el legajo no se puede traer lo avisa, y la autogestión sigue a mano', async () => {
    const fixture = await montar(() => throwError(() => new Error(MENSAJE_ERROR_LEGAJO)));

    expect(tarjeta(fixture)?.querySelector('[role="alert"]')?.textContent).toContain(
      MENSAJE_ERROR_LEGAJO,
    );
    expect(raiz(fixture).querySelector('app-progreso-tramite')).toBeNull();
    // Los certificados y los justificativos no dependen del legajo.
    expect(raiz(fixture).textContent).toContain('Solicitar certificado');
    expect(raiz(fixture).textContent).toContain('Justificar inasistencia');
  });

  it('"Reintentar" vuelve a pedir el legajo y muestra lo que llegó', async () => {
    let pedidos = 0;
    const fixture = await montar(() =>
      ++pedidos === 1
        ? throwError(() => new Error(MENSAJE_ERROR_LEGAJO))
        : of([documento(101, 'DNI', 'Aprobado')]),
    );

    tarjeta(fixture)!.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await fixture.whenStable();

    expect(pedidos).toBe(2);
    expect(porEntregar(fixture)).toEqual(['Título secundario', 'Apto médico']);
    expect(raiz(fixture).querySelector('app-progreso-tramite')).not.toBeNull();
  });
});
