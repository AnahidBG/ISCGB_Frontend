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
import { PanelDocente } from './panel-docente';

const DOCENTE: Sesion = {
  token: 't',
  idUsuario: 20,
  nombreCompleto: 'Dolores Díaz',
  dni: '30111222',
  email: 'dolores@ejemplo.com',
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
  venceEl: new Date(Date.now() + 60_000),
};

const REQUERIDOS: DocumentoRequerido[] = [
  { idTipoDoc: 1, nombreDocumento: 'DNI', obligatorio: true, anual: false },
  { idTipoDoc: 2, nombreDocumento: 'Título', obligatorio: true, anual: false },
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

async function montar(fuente: FuenteLegajo): Promise<ComponentFixture<PanelDocente>> {
  const obtenerLegajoPropio = typeof fuente === 'function' ? fuente : () => of(fuente);

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { sesion: signal(DOCENTE), cerrarSesion: () => {} } },
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
  const fixture = TestBed.createComponent(PanelDocente);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<PanelDocente>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function tarjeta(fixture: ComponentFixture<PanelDocente>): HTMLElement | null {
  return raiz(fixture).querySelector('app-documentacion-por-entregar');
}

function porEntregar(fixture: ComponentFixture<PanelDocente>): (string | undefined)[] {
  return Array.from(tarjeta(fixture)?.querySelectorAll('li') ?? []).map((li) =>
    li.querySelector('span')?.textContent?.trim(),
  );
}

describe('PanelDocente: documentación por entregar (SCRUM-150)', () => {
  it('muestra los obligatorios que nunca se subieron', async () => {
    const fixture = await montar([documento(101, 'DNI', 'Rechazado')]);

    // El DNI se subió (aunque esté rechazado) y el Curriculum no es obligatorio.
    expect(porEntregar(fixture)).toEqual(['Título', 'Apto médico']);
  });

  it('con todo lo obligatorio cargado lo dice, en vez de listar', async () => {
    const fixture = await montar([
      documento(101, 'DNI', 'Aprobado'),
      documento(102, 'Título', 'Pendiente'),
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
      documento(102, 'Título', 'Aprobado'),
      documento(103, 'Apto médico', 'Aprobado'),
    ]);

    expect(tarjeta(fixture)).toBeNull();
  });

  it('mientras el legajo carga lo dice, y el resto del panel espera', async () => {
    const fixture = await montar(() => NEVER);

    expect(tarjeta(fixture)?.textContent).toContain('Cargando tu documentación…');
    // Sin esto las métricas dirían "0 documentos" antes de saberlo.
    expect(raiz(fixture).querySelector('app-tarjeta-metrica')).toBeNull();
  });

  it('si el legajo no se puede traer lo avisa, en vez de romper el panel', async () => {
    const fixture = await montar(() => throwError(() => new Error(MENSAJE_ERROR_LEGAJO)));

    expect(tarjeta(fixture)?.querySelector('[role="alert"]')?.textContent).toContain(
      MENSAJE_ERROR_LEGAJO,
    );
    expect(raiz(fixture).querySelector('app-tarjeta-metrica')).toBeNull();
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
    expect(porEntregar(fixture)).toEqual(['Título', 'Apto médico']);
    expect(raiz(fixture).querySelector('app-tarjeta-metrica')).not.toBeNull();
  });
});
