import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { MateriasService } from '../../../core/materias/materias.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { NuevaSuplencia } from '../../../core/suplencias/modelos/suplencia';
import { SuplenciasService } from '../../../core/suplencias/suplencias.service';
import { SuplenciasDocentes } from './suplencias-docentes';

const SECRETARIO: Sesion = {
  token: 't',
  idUsuario: 2,
  nombreCompleto: 'Sergio Secretario',
  dni: '12345678',
  email: 'sergio@ejemplo.com',
  roles: ['Secretario'],
  rolesConId: [{ idRol: 2, nombreRol: 'Secretario' }],
  venceEl: new Date(Date.now() + 60_000),
};

/** Lo que se le pidió al servicio, en orden. */
let llamadas: string[];

async function montar(): Promise<ComponentFixture<SuplenciasDocentes>> {
  llamadas = [];
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { sesion: signal(SECRETARIO), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: {
          total: signal(0),
          detalle: signal<NotificacionPanel[]>([]),
          refrescar: () => {},
        },
      },
      {
        provide: MateriasService,
        useValue: { listarDocentes: () => of([{ idDocente: 8, nombreCompleto: 'Ana Pérez' }]) },
      },
      {
        provide: SuplenciasService,
        useValue: {
          asignar: (suplencia: NuevaSuplencia) => {
            llamadas.push(`asignar ${JSON.stringify(suplencia)}`);
            return of({ esSuplente: true, cuentaActiva: true });
          },
          darDeBaja: (idDocente: number) => {
            llamadas.push(`baja ${idDocente}`);
            return of({ esSuplente: false, cuentaActiva: false });
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(SuplenciasDocentes);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<SuplenciasDocentes>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function completar(fixture: ComponentFixture<SuplenciasDocentes>, valores: Record<string, string>) {
  for (const [id, valor] of Object.entries(valores)) {
    const control = raiz(fixture).querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
  }
}

describe('SuplenciasDocentes', () => {
  it('asigna la suplencia con el docente y las fechas, y confirma con su nombre', async () => {
    const fixture = await montar();

    completar(fixture, {
      'suplencia-docente': '8',
      'suplencia-desde': '2026-11-02',
      'suplencia-hasta': '2026-11-30',
    });
    raiz(fixture)
      .querySelector('form[aria-label="Asignar suplencia"]')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(llamadas).toEqual(['asignar {"idDocente":8,"desde":"2026-11-02","hasta":"2026-11-30"}']);
    expect(raiz(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Ana Pérez quedó como docente suplente del 02/11/2026 al 30/11/2026.',
    );
  });

  it('la baja pide confirmación antes de tocar nada y después dice cómo quedó la cuenta', async () => {
    const fixture = await montar();

    completar(fixture, { 'baja-docente': '8' });
    raiz(fixture)
      .querySelector('form[aria-label="Dar de baja una suplencia"]')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(llamadas).toEqual([]);
    const dialogo = raiz(fixture).querySelector('[role="alertdialog"], [role="dialog"]');
    expect(dialogo?.textContent).toContain('Ana Pérez');

    const confirmar = [...dialogo!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Sí, dar de baja'),
    )!;
    confirmar.click();
    await fixture.whenStable();

    expect(llamadas).toEqual(['baja 8']);
    expect(raiz(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'su cuenta quedó inactiva',
    );
  });
});
