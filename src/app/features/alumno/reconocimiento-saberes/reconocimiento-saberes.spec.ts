import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { MateriasService } from '../../../core/materias/materias.service';
import { MateriaDisponible } from '../../../core/materias/modelos/materia-disponible';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import {
  ReconocimientoSaberesService,
  SolicitudReconocimiento,
} from '../../../core/reconocimiento-saberes/reconocimiento-saberes.service';
import { ReconocimientoSaberes } from './reconocimiento-saberes';

const MATERIAS: MateriaDisponible[] = [
  { idMateria: 14, nombre: 'Didáctica General' },
  { idMateria: 3, nombre: 'Programación I' },
];

const pdf = (nombre: string) => new File(['%PDF-1.7'], nombre, { type: 'application/pdf' });

describe('ReconocimientoSaberes', () => {
  let enviadas: SolicitudReconocimiento[];

  async function montar(
    materias: () => Observable<MateriaDisponible[]> = () => of(MATERIAS),
  ): Promise<ComponentFixture<ReconocimientoSaberes>> {
    enviadas = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: signal(null), cerrarSesion: () => {} } },
        {
          provide: CampanaService,
          useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
        },
        { provide: MateriasService, useValue: { listarDisponibles: materias } },
        {
          provide: ReconocimientoSaberesService,
          useValue: {
            enviar: (solicitud: SolicitudReconocimiento): Observable<string> => {
              enviadas.push(solicitud);
              return of('Solicitud enviada a Secretaría/Preceptoria con éxito.');
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(ReconocimientoSaberes);
    await fixture.whenStable();
    return fixture;
  }

  function select(fixture: ComponentFixture<ReconocimientoSaberes>): HTMLSelectElement {
    return (fixture.nativeElement as HTMLElement).querySelector('#materia')!;
  }

  function adjuntarAmbos(fixture: ComponentFixture<ReconocimientoSaberes>): void {
    const componente = fixture.componentInstance as unknown as {
      elegir(adjunto: 'programa' | 'analitico', archivo: File): void;
    };
    componente.elegir('programa', pdf('programa.pdf'));
    componente.elegir('analitico', pdf('analitico.pdf'));
  }

  function enviar(fixture: ComponentFixture<ReconocimientoSaberes>): void {
    (fixture.componentInstance as unknown as { enviar(): void }).enviar();
  }

  it('la materia se elige de la lista del backend, con su id como value', async () => {
    const fixture = await montar();

    const opciones = Array.from(select(fixture).options).map((o) => [o.value, o.text.trim()]);
    expect(opciones).toEqual([
      ['', 'Elegí una materia'],
      ['14', 'Didáctica General'],
      ['3', 'Programación I'],
    ]);
  });

  it('sin materia elegida no envía y lo dice', async () => {
    const fixture = await montar();
    adjuntarAmbos(fixture);

    enviar(fixture);
    await fixture.whenStable();

    expect(enviadas).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Elegí qué materia del ISCGB');
  });

  it('envía el id de la materia elegida y los dos PDF', async () => {
    const fixture = await montar();
    select(fixture).value = '14';
    select(fixture).dispatchEvent(new Event('change'));
    adjuntarAmbos(fixture);

    enviar(fixture);
    await fixture.whenStable();

    expect(enviadas).toHaveLength(1);
    expect(enviadas[0].idMateria).toBe(14);
    expect(enviadas[0].programaPdf.name).toBe('programa.pdf');
    expect(enviadas[0].analiticoPdf.name).toBe('analitico.pdf');
    expect(fixture.nativeElement.textContent).toContain('Solicitud enviada a Secretaría');
  });

  it('si no se pueden traer las materias, lo avisa', async () => {
    const fixture = await montar(() => throwError(() => new Error('No pudimos traer las materias.')));

    expect(fixture.nativeElement.textContent).toContain('No pudimos traer las materias.');
  });
});
