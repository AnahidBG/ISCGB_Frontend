import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { ExamenesService } from '../../../core/examenes/examenes.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { LimiteExamenes } from './limite-examenes';

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
}): Promise<ComponentFixture<LimiteExamenes>> {
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
        provide: ExamenesService,
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
  const fixture = TestBed.createComponent(LimiteExamenes);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<LimiteExamenes>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function campo(fixture: ComponentFixture<LimiteExamenes>): HTMLInputElement | null {
  return raiz(fixture).querySelector('#limite-diario');
}

async function guardarCon(fixture: ComponentFixture<LimiteExamenes>, valor: string) {
  campo(fixture)!.value = valor;
  campo(fixture)!.dispatchEvent(new Event('input'));
  raiz(fixture).querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
}

describe('LimiteExamenes', () => {
  it('muestra el límite vigente que devuelve el servidor', async () => {
    const fixture = await montar({ limiteDiario: () => of(2) });

    expect(campo(fixture)?.value).toBe('2');
  });

  it('al guardar manda el valor y confirma con el límite nuevo', async () => {
    const fixture = await montar({ limiteDiario: () => of(2) });

    await guardarCon(fixture, '3');

    expect(guardados).toEqual([3]);
    expect(raiz(fixture).querySelector('main [role="status"]')?.textContent).toContain(
      'Límite actualizado: 3 exámenes por día.',
    );
    expect(campo(fixture)?.value).toBe('3');
  });
});
