import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import {
  AdjuntoReconocimiento,
  SolicitudPendiente,
} from '../../../core/reconocimiento-saberes/modelos/solicitud-pendiente';
import { ReconocimientoSaberesService } from '../../../core/reconocimiento-saberes/reconocimiento-saberes.service';
import { SolicitudesReconocimiento } from './solicitudes-reconocimiento';

const SOLICITUDES: SolicitudPendiente[] = [
  {
    idSolicitud: 5,
    alumno: 'Gómez, María',
    dni: '12345678',
    materia: 'Didáctica General',
    comentario: 'La cursé en la UTN en 2024.',
  },
  { idSolicitud: 6, alumno: 'Pérez, Juan', dni: '', materia: 'Pedagogía', comentario: null },
];

describe('SolicitudesReconocimiento', () => {
  let pedidosDeAdjunto: { idSolicitud: number; adjunto: AdjuntoReconocimiento }[];
  let descargaFalla: boolean;

  async function montar(
    listar: () => Observable<SolicitudPendiente[]> = () => of(SOLICITUDES),
  ): Promise<ComponentFixture<SolicitudesReconocimiento>> {
    pedidosDeAdjunto = [];
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sesion: signal(null), cerrarSesion: () => {} } },
        {
          provide: CampanaService,
          useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
        },
        {
          provide: ReconocimientoSaberesService,
          useValue: {
            listarPendientes: listar,
            descargarAdjunto: (idSolicitud: number, adjunto: AdjuntoReconocimiento) => {
              pedidosDeAdjunto.push({ idSolicitud, adjunto });
              return descargaFalla
                ? throwError(() => new Error('El archivo de esta solicitud no está en el servidor.'))
                : of(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(SolicitudesReconocimiento);
    await fixture.whenStable();
    return fixture;
  }

  function texto(fixture: ComponentFixture<SolicitudesReconocimiento>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function botones(fixture: ComponentFixture<SolicitudesReconocimiento>): HTMLButtonElement[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button[data-adjunto]'));
  }

  beforeEach(() => {
    descargaFalla = false;
    // jsdom no implementa object URLs: alcanza con que existan.
    URL.createObjectURL = vi.fn(() => 'blob:prueba');
    URL.revokeObjectURL = vi.fn();
  });

  it('muestra cada solicitud con alumno, DNI, materia y comentario', async () => {
    const fixture = await montar();

    expect(texto(fixture)).toContain('Gómez, María');
    expect(texto(fixture)).toContain('12.345.678');
    expect(texto(fixture)).toContain('Didáctica General');
    expect(texto(fixture)).toContain('La cursé en la UTN en 2024.');
    expect(texto(fixture)).toContain('Pérez, Juan');
  });

  it('cada solicitud tiene los dos PDF para bajar, y piden el correcto', async () => {
    const fixture = await montar();
    expect(botones(fixture)).toHaveLength(4);

    botones(fixture)
      .find((b) => b.dataset['solicitud'] === '6' && b.dataset['adjunto'] === 'analitico')!
      .click();
    await fixture.whenStable();

    expect(pedidosDeAdjunto).toEqual([{ idSolicitud: 6, adjunto: 'analitico' }]);
  });

  it('si un PDF no se puede bajar, lo dice al lado de esa solicitud', async () => {
    descargaFalla = true;
    const fixture = await montar();

    botones(fixture)[0].click();
    await fixture.whenStable();

    expect(texto(fixture)).toContain('El archivo de esta solicitud no está en el servidor.');
  });

  it('sin solicitudes lo dice', async () => {
    const fixture = await montar(() => of([]));

    expect(texto(fixture)).toContain('No hay solicitudes de reconocimiento esperando');
  });

  it('si la lista no se puede traer, muestra el error con reintentar', async () => {
    const fixture = await montar(() => throwError(() => new Error('No pudimos traer las solicitudes.')));

    expect(texto(fixture)).toContain('No pudimos traer las solicitudes.');
    expect(texto(fixture)).toContain('Reintentar');
  });
});
