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

const RECORDATORIO = 'Recordá presentar este documento en Secretaría.';

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

/** Todos los que pueden llegar a esta pantalla: ninguno declara la entrega. */
const QUIENES_SUBEN: [string, Sesion][] = [
  ['el Docente', sesionCon([{ idRol: 3, nombreRol: 'Docente' }])],
  ['el Alumno', sesionCon([{ idRol: 4, nombreRol: 'Alumno' }])],
  [
    'el Director que además da clase',
    sesionCon([
      { idRol: 1, nombreRol: 'Director' },
      { idRol: 3, nombreRol: 'Docente' },
    ]),
  ],
];

describe('SubirDocumento: quien sube no declara la entrega en papel', () => {
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

  function casillas(fixture: ComponentFixture<SubirDocumento>): NodeListOf<HTMLInputElement> {
    return (fixture.nativeElement as HTMLElement).querySelectorAll('input[type="checkbox"]');
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

  it.each(QUIENES_SUBEN)('%s no tiene casilla para tildar: solo el recordatorio', async (_quien, sesion) => {
    const fixture = await montar(sesion);

    expect(casillas(fixture)).toHaveLength(0);
    expect(texto(fixture)).not.toContain('También entregué este documento en Secretaría');
    expect(texto(fixture)).toContain(RECORDATORIO);
  });

  it.each(QUIENES_SUBEN)('lo que sube %s viaja con presentadoFisico en false', async (_quien, sesion) => {
    const fixture = await montar(sesion);

    await enviar(fixture);

    expect(enviados).toHaveLength(1);
    expect(enviados[0].presentadoFisico).toBe(false);
  });

  it('el recordatorio sigue a la vista en la pantalla de confirmación', async () => {
    const fixture = await montar(QUIENES_SUBEN[0][1]);

    await enviar(fixture);

    expect(texto(fixture)).toContain('Documento enviado');
    expect(texto(fixture)).toContain(RECORDATORIO);
    expect(texto(fixture)).not.toContain('Quedó registrado que también lo entregaste');
  });
});
