import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { LegajoService } from '../../../core/legajos/legajo.service';
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

async function montar(legajo: DocumentoLegajo[]): Promise<ComponentFixture<PanelAlumno>> {
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
          obtenerLegajoPropio: (): Observable<DocumentoLegajo[]> => of(legajo),
          documentosRequeridos: (): Observable<DocumentoRequerido[]> => of(REQUERIDOS),
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PanelAlumno);
  await fixture.whenStable();
  return fixture;
}

function tarjeta(fixture: ComponentFixture<PanelAlumno>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('app-documentacion-por-entregar');
}

describe('PanelAlumno: documentación por entregar (SCRUM-150)', () => {
  it('muestra los obligatorios que nunca se subieron', async () => {
    const fixture = await montar([documento(101, 'DNI', 'Rechazado')]);

    const nombres = Array.from(tarjeta(fixture)?.querySelectorAll('li') ?? []).map((li) =>
      li.querySelector('span')?.textContent?.trim(),
    );
    // El DNI se subió (aunque esté rechazado) y el Curriculum no es obligatorio.
    expect(nombres).toEqual(['Título secundario', 'Apto médico']);
  });

  it('con todo lo obligatorio cargado no muestra la tarjeta', async () => {
    const fixture = await montar([
      documento(101, 'DNI', 'Aprobado'),
      documento(102, 'Título secundario', 'Pendiente'),
      documento(103, 'Apto médico', 'Aprobado'),
    ]);

    expect(tarjeta(fixture)).toBeNull();
  });
});
