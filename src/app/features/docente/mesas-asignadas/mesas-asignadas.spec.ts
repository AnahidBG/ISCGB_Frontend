import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_MESAS_ASIGNADAS,
} from '../../../core/examenes/calendario-examenes.service';
import { MesaAsignada } from '../../../core/examenes/modelos/mesa-asignada';
import { MesasExamenService } from '../../../core/mesas/mesas-examen.service';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { MesasAsignadas } from './mesas-asignadas';

registerLocaleData(localeEsAr);

const DOCENTE: Sesion = {
  token: 't',
  idUsuario: 5,
  nombreCompleto: 'Dolores Docente',
  dni: '12345678',
  email: 'dolores@ejemplo.com',
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
  venceEl: new Date(Date.now() + 60_000),
};

/** Una mesa que cae dentro de `dias` días, a las 9. */
function mesaDentroDe(idExamen: number, materia: string, dias: number): MesaAsignada {
  const hoy = new Date();
  return {
    idExamen,
    materia,
    fecha: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, 9, 0),
  };
}

/** Las respuestas que salieron, en orden: `[idExamen, acepta]`. */
let respuestas: [number, boolean][];
let refrescosDeCampana: number;

async function montar(opciones: {
  mesas: () => Observable<MesaAsignada[]>;
  responder?: () => Observable<void>;
}): Promise<ComponentFixture<MesasAsignadas>> {
  respuestas = [];
  refrescosDeCampana = 0;
  const responder = opciones.responder ?? (() => of(undefined));

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-AR' },
      { provide: AuthService, useValue: { sesion: signal(DOCENTE), cerrarSesion: () => {} } },
      {
        provide: CampanaService,
        useValue: {
          total: signal(0),
          detalle: signal<NotificacionPanel[]>([]),
          refrescar: () => refrescosDeCampana++,
        },
      },
      { provide: CalendarioExamenesService, useValue: { mesasAsignadas: opciones.mesas } },
      {
        provide: MesasExamenService,
        useValue: {
          responderAsignacion: (idExamen: number, acepta: boolean) => {
            respuestas.push([idExamen, acepta]);
            return responder();
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(MesasAsignadas);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<MesasAsignadas>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function mesas(fixture: ComponentFixture<MesasAsignadas>): string[] {
  return Array.from(raiz(fixture).querySelectorAll('[data-mesa] h3')).map(
    (titulo) => titulo.textContent?.trim() ?? '',
  );
}

async function tocar(fixture: ComponentFixture<MesasAsignadas>, selector: string) {
  raiz(fixture).querySelector<HTMLElement>(selector)!.click();
  await fixture.whenStable();
}

describe('MesasAsignadas (SCRUM-246)', () => {
  it('lista las mesas por responder, de la más próxima a la más lejana, sin las que ya pasaron', async () => {
    const fixture = await montar({
      mesas: () =>
        of([
          mesaDentroDe(1, 'Redes', 14),
          mesaDentroDe(2, 'Álgebra', 3),
          mesaDentroDe(3, 'Historia', -2),
        ]),
    });

    expect(mesas(fixture)).toEqual(['Álgebra', 'Redes']);
  });

  it('sin mesas lo dice', async () => {
    const fixture = await montar({ mesas: () => of([]) });

    expect(raiz(fixture).textContent).toContain('No tenés mesas de examen por responder.');
  });

  it('aceptar responde, saca la mesa, confirma y refresca la campana', async () => {
    const fixture = await montar({ mesas: () => of([mesaDentroDe(7, 'Redes', 5)]) });
    const refrescosAlMontar = refrescosDeCampana;

    await tocar(fixture, '[data-mesa="7"] [data-accion="aceptar"] button');

    expect(respuestas).toEqual([[7, true]]);
    expect(mesas(fixture)).toEqual([]);
    expect(raiz(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Aceptaste la mesa de Redes',
    );
    expect(refrescosDeCampana).toBe(refrescosAlMontar + 1);
  });

  it('rechazar pide confirmación y, al confirmar, responde que no', async () => {
    const fixture = await montar({ mesas: () => of([mesaDentroDe(7, 'Redes', 5)]) });

    await tocar(fixture, '[data-mesa="7"] [data-accion="rechazar"] button');

    expect(respuestas).toEqual([]);
    expect(raiz(fixture).querySelector('[role="alertdialog"]')?.textContent).toContain('Redes');

    const [confirmar] = Array.from(
      raiz(fixture).querySelectorAll<HTMLButtonElement>('[role="alertdialog"] button'),
    );
    confirmar.click();
    await fixture.whenStable();

    expect(respuestas).toEqual([[7, false]]);
    expect(raiz(fixture).querySelector('[role="alertdialog"]')).toBeNull();
    expect(raiz(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Rechazaste la mesa de Redes',
    );
  });

  it('si el backend rechaza la respuesta muestra su mensaje y deja la mesa', async () => {
    const fixture = await montar({
      mesas: () => of([mesaDentroDe(7, 'Redes', 5)]),
      responder: () =>
        throwError(() => new Error('Esta asignación ya fue respondida anteriormente (Aceptada).')),
    });

    await tocar(fixture, '[data-mesa="7"] [data-accion="aceptar"] button');

    expect(raiz(fixture).querySelector('main [role="alert"]')?.textContent).toContain(
      'ya fue respondida',
    );
    expect(mesas(fixture)).toEqual(['Redes']);
  });

  it('si no se pueden traer las mesas lo avisa, y "Reintentar" las vuelve a pedir', async () => {
    let pedidos = 0;
    const fixture = await montar({
      mesas: () =>
        ++pedidos === 1
          ? throwError(() => new Error(MENSAJE_ERROR_MESAS_ASIGNADAS))
          : of([mesaDentroDe(7, 'Redes', 5)]),
    });

    expect(raiz(fixture).querySelector('main [role="alert"]')?.textContent).toContain(
      MENSAJE_ERROR_MESAS_ASIGNADAS,
    );

    await tocar(fixture, 'main [role="alert"] button');

    expect(mesas(fixture)).toEqual(['Redes']);
  });
});
