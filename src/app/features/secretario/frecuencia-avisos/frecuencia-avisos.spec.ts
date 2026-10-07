import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import {
  FrecuenciaAvisosService,
  MENSAJE_ERROR_FRECUENCIA,
} from '../../../core/notificaciones/frecuencia-avisos.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { FrecuenciaAvisos } from './frecuencia-avisos';

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

/** Lo que se guardó, en orden: los argumentos de cada `guardar`. */
let guardados: number[];

async function montar(servicio: {
  obtener: () => Observable<number>;
  guardar?: (dias: number) => Observable<void>;
}): Promise<ComponentFixture<FrecuenciaAvisos>> {
  guardados = [];
  const guardar = servicio.guardar ?? (() => of(undefined));

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { sesion: signal(SECRETARIO), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: { total: signal(0), detalle: signal<NotificacionPanel[]>([]), refrescar: () => {} },
      },
      {
        provide: FrecuenciaAvisosService,
        useValue: {
          obtener: servicio.obtener,
          guardar: (dias: number) => {
            guardados.push(dias);
            return guardar(dias);
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(FrecuenciaAvisos);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<FrecuenciaAvisos>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function campo(fixture: ComponentFixture<FrecuenciaAvisos>): HTMLInputElement | null {
  return raiz(fixture).querySelector('#dias-frecuencia');
}

async function guardarCon(fixture: ComponentFixture<FrecuenciaAvisos>, valor: string) {
  campo(fixture)!.value = valor;
  campo(fixture)!.dispatchEvent(new Event('input'));
  raiz(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('FrecuenciaAvisos (SCRUM-151)', () => {
  it('muestra la frecuencia vigente que devuelve el servidor', async () => {
    const fixture = await montar({ obtener: () => of(14) });

    expect(campo(fixture)?.value).toBe('14');
  });

  it('al guardar manda el valor y confirma con la frecuencia nueva', async () => {
    const fixture = await montar({ obtener: () => of(7) });

    await guardarCon(fixture, '30');

    expect(guardados).toEqual([30]);
    expect(raiz(fixture).querySelector('main [role="status"]')?.textContent).toContain(
      'cada 30 días',
    );
    expect(campo(fixture)?.value).toBe('30');
  });

  it('si el backend rechaza el valor muestra su mensaje y no da el cambio por hecho', async () => {
    const fixture = await montar({
      obtener: () => of(7),
      guardar: () => throwError(() => new Error('La frecuencia debe ser mayor a 0 días.')),
    });

    await guardarCon(fixture, '30');

    expect(raiz(fixture).querySelector('form > [role="alert"]')?.textContent).toContain(
      'La frecuencia debe ser mayor a 0 días.',
    );
    expect(raiz(fixture).querySelector('main [role="status"]')).toBeNull();
  });

  it('si no se puede traer la frecuencia lo avisa, y "Reintentar" la vuelve a pedir', async () => {
    let pedidos = 0;
    const fixture = await montar({
      obtener: () =>
        ++pedidos === 1 ? throwError(() => new Error(MENSAJE_ERROR_FRECUENCIA)) : of(10),
    });

    expect(raiz(fixture).querySelector('main [role="alert"]')?.textContent).toContain(
      MENSAJE_ERROR_FRECUENCIA,
    );
    expect(campo(fixture)).toBeNull();

    raiz(fixture).querySelector<HTMLButtonElement>('main [role="alert"] button')!.click();
    await fixture.whenStable();

    expect(campo(fixture)?.value).toBe('10');
  });
});
