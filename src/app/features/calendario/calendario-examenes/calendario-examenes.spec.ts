import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Sesion } from '../../../core/auth/modelos/sesion';
import { ExamenesService, MENSAJE_ERROR_CALENDARIO } from '../../../core/examenes/examenes.service';
import { EstadoMes } from '../../../core/examenes/modelos/estado-mes';
import { CampanaService } from '../../../core/notificaciones/campana.service';
import { NotificacionPanel } from '../../../core/notificaciones/modelos/notificacion-panel';
import { CalendarioExamenes } from './calendario-examenes';

const DOCENTE: Sesion = {
  token: 't',
  idUsuario: 3,
  nombreCompleto: 'Dolores Díaz',
  dni: '12345678',
  email: 'dolores@ejemplo.com',
  roles: ['Docente'],
  rolesConId: [{ idRol: 3, nombreRol: 'Docente' }],
  venceEl: new Date(Date.now() + 60_000),
};

/** Octubre de 2026: un examen el 13 y el límite alcanzado el 20. */
const OCTUBRE: EstadoMes = {
  limiteDiario: 2,
  diasOcupados: [
    { fecha: new Date(2026, 9, 13), cantidadExamenes: 1, limiteAlcanzado: false },
    { fecha: new Date(2026, 9, 20), cantidadExamenes: 2, limiteAlcanzado: true },
  ],
};

/** Noviembre de 2026: sin exámenes. */
const NOVIEMBRE: EstadoMes = { limiteDiario: 2, diasOcupados: [] };

/** Los meses que pidió la pantalla, en orden: `[anio, mes]`. */
let pedidos: [number, number][];

async function montar(
  estadoDelMes: (anio: number, mes: number) => Observable<EstadoMes>,
): Promise<ComponentFixture<CalendarioExamenes>> {
  pedidos = [];

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
      {
        provide: ExamenesService,
        useValue: {
          estadoDelMes: (anio: number, mes: number) => {
            pedidos.push([anio, mes]);
            return estadoDelMes(anio, mes);
          },
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

/** La celda de un día del mes: la primera cuyo número es ese (los de relleno repiten números). */
function celda(
  fixture: ComponentFixture<CalendarioExamenes>,
  numero: number,
): HTMLTableCellElement | undefined {
  return Array.from(raiz(fixture).querySelectorAll<HTMLTableCellElement>('tbody td')).find(
    (td) => td.querySelector('span')?.textContent?.trim() === String(numero),
  );
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

    // Tabla real: un encabezado por día de la semana y una celda por día (5 semanas).
    const columnas = raiz(fixture).querySelectorAll('thead th[scope="col"]');
    expect(Array.from(columnas).map((th) => th.getAttribute('aria-label'))).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ]);
    expect(raiz(fixture).querySelectorAll('tbody td')).toHaveLength(35);

    expect(celda(fixture, 13)?.textContent).toContain('1 examen');
    expect(celda(fixture, 20)?.textContent).toContain('Completo');
    expect(celda(fixture, 14)?.textContent).toContain('Libre');
    // El límite sale de la respuesta, no de un número escrito en la pantalla.
    expect(raiz(fixture).textContent).toContain('el límite de 2 exámenes por día');

    // Hoy: una sola celda, marcada para los lectores de pantalla.
    const hoy = raiz(fixture).querySelectorAll('td[aria-current="date"]');
    expect(hoy).toHaveLength(1);
    expect(hoy[0].querySelector('span')?.textContent?.trim()).toBe('10');
  });

  it('al pasar de mes pide el nuevo y descarta la respuesta de un mes que ya no se mira', async () => {
    const respuestas: Record<number, Subject<EstadoMes>> = {
      10: new Subject<EstadoMes>(),
      11: new Subject<EstadoMes>(),
    };
    const fixture = await montar((_anio, mes) => respuestas[mes]);

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
    expect(celda(fixture, 13)?.textContent).toContain('Libre');

    await tocar(fixture, 'button[aria-label="Mes anterior"]');
    expect(titulo(fixture)).toBe('Octubre 2026');
  });

  it('"Hoy" vuelve al mes actual, y estando en él no vuelve a pedirlo', async () => {
    const fixture = await montar((_anio, mes) => of(mes === 10 ? OCTUBRE : NOVIEMBRE));

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
    expect(celda(fixture, 20)?.textContent).toContain('Completo');
  });
});
