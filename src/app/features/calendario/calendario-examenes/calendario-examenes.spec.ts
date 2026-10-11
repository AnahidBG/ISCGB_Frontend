import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { aCalendarioDelMes } from '../../../core/examenes/adaptador-estado-mes';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_CALENDARIO,
} from '../../../core/examenes/calendario-examenes.service';
import { CalendarioDelMes } from '../../../core/examenes/modelos/calendario-del-mes';
import { ExamenCalendario } from '../../../core/examenes/modelos/examen-calendario';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { CalendarioExamenes } from './calendario-examenes';

registerLocaleData(localeEsAr);

function sesionDe(rol: 'Docente' | 'Secretario'): Sesion {
  return {
    token: 't',
    idUsuario: 3,
    nombreCompleto: 'Dolores Díaz',
    dni: '12345678',
    email: 'dolores@ejemplo.com',
    roles: [rol],
    venceEl: new Date(Date.now() + 60_000),
  };
}

/** Un mes con la respuesta del backend adaptada, igual que la devuelve el servicio real. */
function mes(anio: number, mesDelAnio: number, diasOcupados: unknown[]): CalendarioDelMes {
  return aCalendarioDelMes({ limiteDiario: 2, diasOcupados }, { anio, mes: mesDelAnio });
}

/** Octubre de 2026: un parcial el 13 y el límite alcanzado el 20. */
const OCTUBRE = mes(2026, 10, [
  { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
  { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
]);

/** Noviembre de 2026: sin parciales. */
const NOVIEMBRE = mes(2026, 11, []);

/** Los meses que pidió la pantalla, en orden: `[anio, mes]`. */
let pedidos: [number, number][];

/** La sesión de la prueba: se cambia para ver qué ve cada rol. */
let sesion: ReturnType<typeof signal<Sesion>>;

async function montar(
  calendarioDelMes: (anio: number, mes: number) => Observable<CalendarioDelMes>,
  examenesDelMes: () => Observable<ExamenCalendario[]> = () => of([]),
): Promise<ComponentFixture<CalendarioExamenes>> {
  pedidos = [];
  sesion = signal(sesionDe('Docente'));

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: LOCALE_ID, useValue: 'es-AR' },
      { provide: AuthService, useValue: { sesion, cerrarSesion: () => {} } },
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
          calendarioDelMes: (anio: number, mesDelAnio: number) => {
            pedidos.push([anio, mesDelAnio]);
            return calendarioDelMes(anio, mesDelAnio);
          },
          examenesDelMes,
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(CalendarioExamenes);
  await fixture.whenStable();
  return fixture;
}

function raiz(fixture: ComponentFixture<CalendarioExamenes>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function titulo(fixture: ComponentFixture<CalendarioExamenes>): string {
  return raiz(fixture).querySelector('h2')?.textContent?.trim() ?? '';
}

/** La celda de un día del mes, por su fecha: "2026-10-13". */
function celda(fixture: ComponentFixture<CalendarioExamenes>, fecha: string): HTMLElement {
  return raiz(fixture).querySelector<HTMLElement>(`td[data-fecha="${fecha}"]`)!;
}

async function tocar(fixture: ComponentFixture<CalendarioExamenes>, selector: string) {
  raiz(fixture).querySelector<HTMLButtonElement>(selector)!.click();
  await fixture.whenStable();
}

describe('CalendarioExamenes (SCRUM-183)', () => {
  beforeEach(() => {
    // Solo `Date`: los timers y las promesas siguen siendo reales.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 10, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('abre en el mes actual y dibuja la grilla con el estado de cada día', async () => {
    const fixture = await montar(() => of(OCTUBRE));

    expect(pedidos).toEqual([[2026, 10]]);
    expect(titulo(fixture)).toBe('Octubre 2026');
    expect(raiz(fixture).querySelector('h1')?.textContent).toContain(
      'Calendario de exámenes parciales',
    );

    // Una grilla real: un encabezado por día de la semana, de lunes a domingo, y una celda por día.
    const columnas = raiz(fixture).querySelectorAll('table[role="grid"] thead th[scope="col"]');
    expect(Array.from(columnas).map((th) => th.getAttribute('aria-label'))).toEqual([
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
      'domingo',
    ]);
    expect(raiz(fixture).querySelectorAll('tbody td')).toHaveLength(35);
    // Con la API real el listado de parciales viene vacío: no se dibuja ninguno.
    expect(raiz(fixture).querySelectorAll('tbody td button')).toHaveLength(0);

    expect(celda(fixture, '2026-10-13').textContent).toContain('1 parcial');
    expect(celda(fixture, '2026-10-20').textContent).toContain('Completo');
    expect(celda(fixture, '2026-10-14').textContent).toContain('Libre');
    // El día completo lleva el candado, además del color.
    expect(celda(fixture, '2026-10-20').querySelector('app-icono')).not.toBeNull();
    expect(celda(fixture, '2026-10-14').querySelector('app-icono')).toBeNull();

    // La leyenda y la nota salen del límite de la respuesta, no de un número escrito en la pantalla.
    expect(raiz(fixture).querySelector('ul[aria-label]')?.textContent).toContain('1 parcial');
    expect(raiz(fixture).textContent).toContain('el límite de 2 parciales por día');

    // Hoy: una sola celda, marcada para los lectores de pantalla.
    const hoy = raiz(fixture).querySelectorAll('td[aria-current="date"]');
    expect(hoy).toHaveLength(1);
    expect(hoy[0].getAttribute('data-fecha')).toBe('2026-10-10');
  });

  it('cada día se anuncia con su fecha y cuántos parciales tiene', async () => {
    const fixture = await montar(() => of(OCTUBRE));

    expect(celda(fixture, '2026-10-13').getAttribute('aria-label')).toBe(
      '13 de octubre, 1 de 2 parciales',
    );
    expect(celda(fixture, '2026-10-20').getAttribute('aria-label')).toBe(
      '20 de octubre, 2 de 2 parciales, completo',
    );
  });

  it('por ahora no se puede elegir un día: la selección está deshabilitada', async () => {
    const fixture = await montar(() => of(OCTUBRE));

    expect(raiz(fixture).querySelector('table')?.getAttribute('aria-readonly')).toBe('true');
    expect(raiz(fixture).querySelector('[aria-disabled]')).toBeNull();
  });

  it('lista en su día los parciales que trae el servicio', async () => {
    const parcial: ExamenCalendario = {
      idExamen: 1,
      fecha: '2026-10-13',
      materia: 'Matemática',
      comision: 'Comisión 1° A',
      tipo: 'Parcial',
    };

    const fixture = await montar(
      () => of(OCTUBRE),
      () => of([parcial]),
    );

    expect(celda(fixture, '2026-10-13').querySelector('button')?.textContent?.trim()).toBe(
      'Matemática',
    );
    expect(raiz(fixture).querySelectorAll('tbody td button')).toHaveLength(1);
  });

  it('al pasar de mes pide el nuevo y descarta la respuesta de un mes que ya no se mira', async () => {
    const respuestas: Record<number, Subject<CalendarioDelMes>> = {
      10: new Subject<CalendarioDelMes>(),
      11: new Subject<CalendarioDelMes>(),
    };
    const fixture = await montar((_anio, mesDelAnio) => respuestas[mesDelAnio]);

    // Se pasa a noviembre sin que haya llegado octubre.
    await tocar(fixture, 'button[aria-label="Mes siguiente"]');
    expect(titulo(fixture)).toBe('Noviembre 2026');
    expect(pedidos).toEqual([
      [2026, 10],
      [2026, 11],
    ]);

    respuestas[11].next(NOVIEMBRE);
    respuestas[10].next(OCTUBRE);
    await fixture.whenStable();

    // Gana noviembre: octubre llegó tarde y no pisa la grilla.
    expect(raiz(fixture).querySelector('caption')?.textContent).toContain('Noviembre 2026');
    expect(celda(fixture, '2026-11-13').textContent).toContain('Libre');

    await tocar(fixture, 'button[aria-label="Mes anterior"]');
    expect(titulo(fixture)).toBe('Octubre 2026');
  });

  it('"Hoy" vuelve al mes actual, y estando en él no vuelve a pedirlo', async () => {
    const fixture = await montar((_anio, mesDelAnio) =>
      of(mesDelAnio === 10 ? OCTUBRE : NOVIEMBRE),
    );

    const botonHoy = () =>
      Array.from(raiz(fixture).querySelectorAll<HTMLButtonElement>('button')).find(
        (boton) => boton.textContent?.trim() === 'Hoy',
      )!;

    botonHoy().click();
    await fixture.whenStable();
    expect(pedidos).toHaveLength(1);

    await tocar(fixture, 'button[aria-label="Mes siguiente"]');
    botonHoy().click();
    await fixture.whenStable();

    expect(titulo(fixture)).toBe('Octubre 2026');
    expect(pedidos).toEqual([
      [2026, 10],
      [2026, 11],
      [2026, 10],
    ]);
  });

  it('si el mes no se puede traer lo avisa, deja pasar de mes y "Reintentar" lo vuelve a pedir', async () => {
    let llamadas = 0;
    const fixture = await montar(() =>
      ++llamadas === 1 ? throwError(() => new Error(MENSAJE_ERROR_CALENDARIO)) : of(OCTUBRE),
    );

    expect(raiz(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      MENSAJE_ERROR_CALENDARIO,
    );
    expect(raiz(fixture).querySelector('table')).toBeNull();
    // El encabezado sigue: se puede pasar de mes aunque este haya fallado.
    expect(titulo(fixture)).toBe('Octubre 2026');

    await tocar(fixture, '[role="alert"] button');

    expect(raiz(fixture).querySelector('[role="alert"]')).toBeNull();
    expect(celda(fixture, '2026-10-20').textContent).toContain('Completo');
  });

  it('"Cambiar el límite" lo ven Secretaría y Dirección, y el Docente no', async () => {
    const fixture = await montar(() => of(OCTUBRE));
    const enlace = () =>
      Array.from(raiz(fixture).querySelectorAll('a')).find(
        (a) => a.textContent?.trim() === 'Cambiar el límite',
      );

    expect(enlace()).toBeUndefined();

    sesion.set(sesionDe('Secretario'));
    await fixture.whenStable();

    expect(enlace()?.getAttribute('href')).toBe('/secretario/limite-parciales');
  });
});
