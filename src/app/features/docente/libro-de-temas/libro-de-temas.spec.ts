import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { LIBROS_DE_TEMAS } from '../../../core/configuracion/enlaces-externos';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { LibroDeTemas } from './libro-de-temas';

const DOCENTE: Sesion = {
  token: 't',
  idUsuario: 8,
  nombreCompleto: 'Dora Docente',
  dni: '30111222',
  email: 'dora@ejemplo.com',
  roles: ['Docente'],
  venceEl: new Date(Date.now() + 60_000),
};

describe('LibroDeTemas (SCRUM-232)', () => {
  it('ofrece un acceso por año, que abre su carpeta de Drive en otra pestaña', async () => {
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
      ],
    });
    const fixture = TestBed.createComponent(LibroDeTemas);
    await fixture.whenStable();

    const accesos = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>(
        '[data-seccion="libros"] a',
      ),
    ];
    expect(accesos.map((a) => a.textContent)).toEqual([
      expect.stringContaining('Primer año'),
      expect.stringContaining('Segundo año'),
    ]);
    expect(accesos.map((a) => a.href)).toEqual(LIBROS_DE_TEMAS.map((libro) => libro.enlace));
    for (const acceso of accesos) {
      expect(acceso.target).toBe('_blank');
      expect(acceso.rel).toBe('noopener noreferrer');
    }
  });
});
