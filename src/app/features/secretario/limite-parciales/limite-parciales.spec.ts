import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { CalendarioExamenesService } from '../../../core/examenes/calendario-examenes.service';
import { PERIODO_DEL_LIMITE } from '../../../core/examenes/periodo-limite';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { LimiteParciales } from './limite-parciales';

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

/** Lo que se guardó, en orden: los argumentos de cada `guardarLimiteDiario`. */
let guardados: number[];

async function montar(servicio: {
  limiteDiario: () => Observable<number>;
  guardarLimiteDiario?: (limite: number) => Observable<void>;
}): Promise<ComponentFixture<LimiteParciales>> {
  guardados = [];
  const guardar = servicio.guardarLimiteDiario ?? (() => of(undefined));

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
        provide: CalendarioExamenesService,
        useValue: {
          limiteDiario: servicio.limiteDiario,
          guardarLimiteDiario: (limite: number) => {
            guardados.push(limite);
            return guardar(limite);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(LimiteParciales);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<LimiteParciales>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function campo(fixture: ComponentFixture<LimiteParciales>): HTMLInputElement | null {
  return raiz(fixture).querySelector('#limite-diario');
}

async function guardarCon(fixture: ComponentFixture<LimiteParciales>, valor: string) {
  campo(fixture)!.value = valor;
  campo(fixture)!.dispatchEvent(new Event('input'));
  raiz(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('LimiteParciales', () => {
  it('muestra el límite vigente que devuelve el servidor, con el período en el título y el campo', async () => {
    const fixture = await montar({ limiteDiario: () => of(2) });

    expect(campo(fixture)?.value).toBe('2');
    expect(raiz(fixture).querySelector('h1')?.textContent).toContain('Límite de parciales');
    expect(raiz(fixture).textContent).toContain(`Parciales por ${PERIODO_DEL_LIMITE}`);
    expect(raiz(fixture).textContent).toContain(`se pueden registrar por ${PERIODO_DEL_LIMITE}`);
  });

  it('lleva al calendario con un enlace de texto', async () => {
    const fixture = await montar({ limiteDiario: () => of(2) });
    const enlace = Array.from(raiz(fixture).querySelectorAll('main a')).find(
      (a) => a.textContent?.trim() === 'Ver el calendario de parciales',
    );

    expect(enlace?.getAttribute('href')).toBe('/calendario');
  });

  it('al guardar manda el valor y confirma con el límite nuevo', async () => {
    const fixture = await montar({ limiteDiario: () => of(2) });

    await guardarCon(fixture, '3');

    expect(guardados).toEqual([3]);
    expect(raiz(fixture).querySelector('main [role="status"]')?.textContent).toContain(
      'Límite actualizado: 3 parciales por día.',
    );
    expect(campo(fixture)?.value).toBe('3');
  });
});
