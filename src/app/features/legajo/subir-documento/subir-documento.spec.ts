import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { RolApi } from '../../../core/auth/modelos/rol';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { DocumentoRequerido, NuevoDocumentoLegajo } from '../../../core/legajos/modelos/documento-requerido';
import { LegajoService } from '../../../core/legajos/legajo.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { SubirDocumento } from './subir-documento';

const TIPOS: DocumentoRequerido[] = [
  { idTipoDoc: 7, nombreDocumento: 'DNI', obligatorio: true, anual: false },
];

function sesionCon(rolesConId: RolApi[]): Sesion {
  return {
    token: 't',
    idUsuario: 12,
    nombreCompleto: 'Ana Gómez',
    dni: '12345678',
    email: 'ana@ejemplo.com',
    roles: rolesConId.map((rol) => rol.nombreRol ?? ''),
    rolesConId,
    venceEl: new Date(Date.now() + 60_000),
  };
}

const DOCENTE = sesionCon([{ idRol: 3, nombreRol: 'Docente' }]);
const ALUMNO = sesionCon([{ idRol: 4, nombreRol: 'Alumno' }]);

describe('SubirDocumento: casilla "también lo entregué en Secretaría"', () => {
  let enviados: NuevoDocumentoLegajo[];

  async function montar(sesion: Sesion): Promise<ComponentFixture<SubirDocumento>> {
    enviados = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: signal(sesion), cerrarSesion: () => {} } },
        {
          provide: CampanaService,
          useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
        },
        {
          provide: LegajoService,
          useValue: {
            documentosRequeridos: (): Observable<DocumentoRequerido[]> => of(TIPOS),
            subirDocumento: (documento: NuevoDocumentoLegajo): Observable<void> => {
              enviados.push(documento);
              return of(undefined);
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(SubirDocumento);
    await fixture.whenStable();
    return fixture;
  }

  function casilla(fixture: ComponentFixture<SubirDocumento>): HTMLInputElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('#entregoEnPapel');
  }

  function texto(fixture: ComponentFixture<SubirDocumento>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  /** Completa tipo y archivo y envía, sin pasar por la zona de arrastre. */
  async function enviar(fixture: ComponentFixture<SubirDocumento>): Promise<void> {
    const componente = fixture.componentInstance as unknown as {
      idTipoElegido: { set(valor: number): void };
      archivo: { set(valor: File): void };
      enviar(): void;
    };
    componente.idTipoElegido.set(7);
    componente.archivo.set(new File(['%PDF-1.7'], 'dni.pdf', { type: 'application/pdf' }));
    componente.enviar();
    await fixture.whenStable();
  }

  it('el Docente ve la casilla, sin tildar de entrada', async () => {
    const fixture = await montar(DOCENTE);

    expect(casilla(fixture)).not.toBeNull();
    expect(casilla(fixture)!.checked).toBe(false);
  });

  it('el Docente que la tilda manda presentadoFisico en true y deja de ver el recordatorio', async () => {
    const fixture = await montar(DOCENTE);
    expect(texto(fixture)).toContain('Recordá presentar este documento en Secretaría.');

    casilla(fixture)!.click();
    await fixture.whenStable();
    expect(texto(fixture)).not.toContain('Recordá presentar este documento en Secretaría.');

    await enviar(fixture);
    expect(enviados).toHaveLength(1);
    expect(enviados[0].presentadoFisico).toBe(true);
  });

  it('el Docente que no la tilda manda false y sigue viendo el recordatorio', async () => {
    const fixture = await montar(DOCENTE);

    await enviar(fixture);

    expect(enviados[0].presentadoFisico).toBe(false);
    expect(texto(fixture)).toContain('Recordá presentar este documento en Secretaría.');
  });

  it('el Alumno NO ve la casilla: solo el recordatorio, y manda siempre false', async () => {
    const fixture = await montar(ALUMNO);

    expect(casilla(fixture)).toBeNull();
    expect(texto(fixture)).toContain('Recordá presentar este documento en Secretaría.');

    await enviar(fixture);
    expect(enviados[0].presentadoFisico).toBe(false);
  });

  it('"Subir otro documento" vuelve a dejar la casilla sin tildar', async () => {
    const fixture = await montar(DOCENTE);
    casilla(fixture)!.click();
    await enviar(fixture);

    (fixture.componentInstance as unknown as { subirOtro(): void }).subirOtro();
    await fixture.whenStable();

    expect(casilla(fixture)!.checked).toBe(false);
  });
});
