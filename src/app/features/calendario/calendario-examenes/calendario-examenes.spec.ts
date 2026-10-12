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
  MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
} from '../../../core/examenes/calendario-examenes.service';
import { CalendarioDelMes } from '../../../core/examenes/modelos/calendario-del-mes';
import { ExamenCalendario } from '../../../core/examenes/modelos/examen-calendario';
import { MateriaDelDocente } from '../../../core/examenes/modelos/materia-del-docente';
import { NuevoExamen } from '../../../core/examenes/modelos/nuevo-examen';
import { TipoExamen } from '../../../core/examenes/modelos/tipo-examen';
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

/** Las materias del docente: una de ellas en dos comisiones. */
const MATERIAS: MateriaDelDocente[] = [
  {
    idMateria: 4,
    materia: 'Programación II',
    carrera: 'Tecnicatura en Desarrollo de Software',
    idComision: 1,
    comision: 'Comisión A',
  },
  {
    idMateria: 4,
    materia: 'Programación II',
    carrera: 'Tecnicatura en Desarrollo de Software',
    idComision: 2,
    comision: 'Comisión B',
  },
];

const TIPOS: TipoExamen[] = [
  { idTipoExamen: 1, nombre: 'Parcial' },
  { idTipoExamen: 4, nombre: 'Coloquio' },
];

/** Un parcial del 13 de octubre, de los que lista el servicio simulado. */
const PARCIAL_DEL_13: ExamenCalendario = {
  idExamen: 1,
  fecha: '2026-10-13',
  horario: '14:00',
  materia: 'Matemática',
  comision: 'Comisión 1° A',
  tipo: 'Parcial',
};

/** Cómo responde el servicio al registro de un parcial. Lo que no se pasa, anda bien. */
interface ServicioDeRegistro {
  materiasDelDocente?: () => Observable<MateriaDelDocente[]>;
  tiposDeExamen?: () => Observable<TipoExamen[]>;
  registrarExamen?: (examen: NuevoExamen) => Observable<void>;
  reprogramarExamen?: (idExamen: number, fechaYHora: string) => Observable<void>;
  eliminarExamen?: (idExamen: number) => Observable<void>;
}

/** Los meses que pidió la pantalla, en orden: `[anio, mes]`. */
let pedidos: [number, number][];

/** Los parciales que se mandaron a registrar, en orden. */
let registrados: NuevoExamen[];

/** Los parciales que se mandaron a reprogramar y los que se mandaron a eliminar, en orden. */
let reprogramados: { idExamen: number; fechaYHora: string }[];
let eliminados: number[];

/** La sesión de la prueba: se cambia para ver qué ve cada rol. */
let sesion: ReturnType<typeof signal<Sesion>>;

async function montar(
  calendarioDelMes: (anio: number, mes: number) => Observable<CalendarioDelMes>,
  examenesDelMes: () => Observable<ExamenCalendario[]> = () => of([]),
  registro: ServicioDeRegistro = {},
): Promise<ComponentFixture<CalendarioExamenes>> {
  pedidos = [];
  registrados = [];
  reprogramados = [];
  eliminados = [];
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
          materiasDelDocente: registro.materiasDelDocente ?? (() => of(MATERIAS)),
          tiposDeExamen: registro.tiposDeExamen ?? (() => of(TIPOS)),
          registrarExamen: (examen: NuevoExamen) => {
            registrados.push(examen);
            return (registro.registrarExamen ?? (() => of(undefined)))(examen);
          },
          reprogramarExamen: (idExamen: number, fechaYHora: string) => {
            reprogramados.push({ idExamen, fechaYHora });
            return (registro.reprogramarExamen ?? (() => of(undefined)))(idExamen, fechaYHora);
          },
          eliminarExamen: (idExamen: number) => {
            eliminados.push(idExamen);
            return (registro.eliminarExamen ?? (() => of(undefined)))(idExamen);
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

/** La celda de un día del mes, por su fecha: "2026-10-13". */
function celda(fixture: ComponentFixture<CalendarioExamenes>, fecha: string): HTMLElement {
  return raiz(fixture).querySelector<HTMLElement>(`td[data-fecha="${fecha}"]`)!;
}

async function tocar(fixture: ComponentFixture<CalendarioExamenes>, selector: string) {
  raiz(fixture).querySelector<HTMLButtonElement>(selector)!.click();
  await fixture.whenStable();
}

/** El modal de registro, o `null` si está cerrado. */
function dialogo(fixture: ComponentFixture<CalendarioExamenes>): HTMLElement | null {
  return raiz(fixture).querySelector<HTMLElement>('[role="dialog"]');
}

/** Elige un día como lo haría una persona: el foco queda en su celda y se la toca. */
async function elegirDia(fixture: ComponentFixture<CalendarioExamenes>, fecha: string) {
  celda(fixture, fecha).focus();
  celda(fixture, fecha).click();
  await fixture.whenStable();
}

/** Escribe en un campo del formulario del modal, con el evento que escucha Angular. */
function escribir(
  fixture: ComponentFixture<CalendarioExamenes>,
  selector: string,
  valor: string,
): void {
  const campo = raiz(fixture).querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  campo.value = valor;
  campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? 'change' : 'input'));
}

/** Completa lo que el modal no trae resuelto: la materia con su comisión, el tipo y el horario. */
async function completarRegistro(fixture: ComponentFixture<CalendarioExamenes>) {
  escribir(fixture, '#registro-materia', '4-1');
  escribir(fixture, '#registro-tipo', '1');
  escribir(fixture, '#registro-horario', '09:00');
  await fixture.whenStable();
}

async function guardarRegistro(fixture: ComponentFixture<CalendarioExamenes>) {
  dialogo(fixture)!.querySelector('form')!.dispatchEvent(new Event('submit'));
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

  it('el Docente puede elegir un día y lo orienta un texto; Secretaría y Dirección solo miran', async () => {
    const fixture = await montar(() => of(OCTUBRE));
    const ayuda =
      'Elegí un día disponible para registrar un parcial. Los días completos y las fechas pasadas no admiten registros.';

    expect(raiz(fixture).querySelector('table')?.getAttribute('aria-readonly')).toBeNull();
    // El día completo y el pasado no se pueden elegir.
    expect(celda(fixture, '2026-10-20').getAttribute('aria-disabled')).toBe('true');
    expect(celda(fixture, '2026-10-05').getAttribute('aria-disabled')).toBe('true');
    expect(raiz(fixture).textContent).toContain(ayuda);

    sesion.set(sesionDe('Secretario'));
    await fixture.whenStable();

    expect(raiz(fixture).querySelector('table')?.getAttribute('aria-readonly')).toBe('true');
    expect(raiz(fixture).querySelector('[aria-disabled]')).toBeNull();
    expect(raiz(fixture).textContent).not.toContain(ayuda);

    celda(fixture, '2026-10-13').click();
    await fixture.whenStable();
    expect(dialogo(fixture)).toBeNull();
  });

  it('lista en su día los parciales que trae el servicio', async () => {
    const parcial: ExamenCalendario = {
      idExamen: 1,
      fecha: '2026-10-13',
      horario: '14:00',
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

  describe('registrar un parcial (Docente)', () => {
    it('al elegir un día abre "Registrar parcial" con ese día y las opciones del docente', async () => {
      const fixture = await montar(() => of(OCTUBRE));

      await elegirDia(fixture, '2026-10-13');

      const modal = dialogo(fixture)!;
      expect(modal.querySelector('h2')?.textContent).toContain('Registrar parcial');
      expect(modal.textContent).toContain('Martes 13 de octubre de 2026');
      // El foco entró al modal.
      expect(modal.contains(document.activeElement)).toBe(true);

      // La fecha viene precargada con el día elegido, y no deja ir hacia atrás de hoy.
      const fecha = modal.querySelector<HTMLInputElement>('#registro-fecha')!;
      expect(fecha.type).toBe('date');
      expect(fecha.value).toBe('2026-10-13');
      expect(fecha.getAttribute('min')).toBe('2026-10-10');
      expect(modal.querySelector<HTMLInputElement>('#registro-horario')?.type).toBe('time');
      expect(modal.textContent).toContain('Horario en formato 24 h.');

      // Un solo desplegable elige la materia y la comisión a la vez.
      const opciones = (selector: string) =>
        Array.from(modal.querySelectorAll(`${selector} option`)).map((o) => o.textContent?.trim());
      expect(opciones('#registro-materia')).toEqual([
        'Elegí una materia y comisión',
        'Programación II · Comisión A (Tecnicatura en Desarrollo de Software)',
        'Programación II · Comisión B (Tecnicatura en Desarrollo de Software)',
      ]);
      expect(opciones('#registro-tipo')).toEqual([
        'Elegí un tipo de examen',
        'Parcial',
        'Coloquio',
      ]);
    });

    it('no guarda con campos sin completar o con una fecha pasada, y marca lo que falta', async () => {
      const fixture = await montar(() => of(OCTUBRE));
      await elegirDia(fixture, '2026-10-13');

      escribir(fixture, '#registro-fecha', '2026-10-09');
      await guardarRegistro(fixture);

      const errores = Array.from(dialogo(fixture)!.querySelectorAll('[role="alert"]')).map((e) =>
        e.textContent?.trim(),
      );
      expect(errores).toEqual([
        'Elegí la materia y la comisión.',
        'Elegí el tipo de examen.',
        'La fecha no puede ser anterior a hoy.',
        'Ingresá el horario del parcial.',
      ]);
      expect(registrados).toEqual([]);
      expect(dialogo(fixture)).not.toBeNull();
    });

    it('si el backend lo rechaza (400), muestra su mensaje en el formulario y el modal sigue abierto', async () => {
      const rechazo = 'No se puede registrar. Se ha superado el límite de parciales para ese día.';
      const fixture = await montar(
        () => of(OCTUBRE),
        () => of([]),
        { registrarExamen: () => throwError(() => new Error(rechazo)) },
      );
      await elegirDia(fixture, '2026-10-13');
      await completarRegistro(fixture);

      await guardarRegistro(fixture);

      const modal = dialogo(fixture)!;
      expect(modal.querySelector('form [role="alert"]')?.textContent).toContain(rechazo);
      // Sigue abierto, con lo que se había completado, para elegir otra fecha.
      expect(modal.querySelector<HTMLInputElement>('#registro-fecha')?.value).toBe('2026-10-13');
      expect(modal.querySelector<HTMLInputElement>('#registro-horario')?.value).toBe('09:00');
      expect(raiz(fixture).querySelector('p[role="status"]')).toBeNull();

      // Con otra fecha se puede volver a intentar.
      escribir(fixture, '#registro-fecha', '2026-10-14');
      await guardarRegistro(fixture);
      expect(registrados.map((examen) => examen.dia)).toEqual(['2026-10-13', '2026-10-14']);
    });

    it('si sale bien, cierra el modal, avisa, devuelve el foco al día y vuelve a pedir el mes', async () => {
      const OCTUBRE_CON_EL_14 = mes(2026, 10, [
        { fecha: '2026-10-13T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
        { fecha: '2026-10-14T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
      ]);
      const fixture = await montar(() => of(pedidos.length === 1 ? OCTUBRE : OCTUBRE_CON_EL_14));
      const diaElegido = celda(fixture, '2026-10-14');
      expect(diaElegido.textContent).toContain('Libre');

      await elegirDia(fixture, '2026-10-14');
      await completarRegistro(fixture);
      await guardarRegistro(fixture);

      expect(registrados).toEqual([
        { dia: '2026-10-14', horario: '09:00', idMateria: 4, idComision: 1, idTipoExamen: 1 },
      ]);
      expect(dialogo(fixture)).toBeNull();
      expect(raiz(fixture).querySelector('p[role="status"]')?.textContent).toContain(
        'Parcial registrado para el miércoles 14 de octubre a las 09:00.',
      );

      // Se pidió otra vez el mes, y el día cambió de color sin tapar la grilla con la espera.
      expect(pedidos).toEqual([
        [2026, 10],
        [2026, 10],
      ]);
      expect(celda(fixture, '2026-10-14')).toBe(diaElegido);
      expect(diaElegido.textContent).toContain('1 parcial');
      expect(document.activeElement).toBe(diaElegido);
    });

    it('sin materias asignadas lo avisa y no deja guardar', async () => {
      const fixture = await montar(
        () => of(OCTUBRE),
        () => of([]),
        { materiasDelDocente: () => of([]) },
      );

      await elegirDia(fixture, '2026-10-13');

      const modal = dialogo(fixture)!;
      expect(modal.textContent).toContain(
        'Todavía no tenés materias asignadas. Consultá en Secretaría.',
      );
      expect(modal.querySelector('form')).toBeNull();
    });

    it('si no se pueden traer las materias lo avisa y "Reintentar" las vuelve a pedir', async () => {
      let llamadas = 0;
      const fixture = await montar(
        () => of(OCTUBRE),
        () => of([]),
        {
          materiasDelDocente: () =>
            ++llamadas === 1
              ? throwError(() => new Error(MENSAJE_ERROR_MATERIAS_DEL_DOCENTE))
              : of(MATERIAS),
        },
      );

      await elegirDia(fixture, '2026-10-13');

      expect(dialogo(fixture)!.querySelector('[role="alert"]')?.textContent).toContain(
        MENSAJE_ERROR_MATERIAS_DEL_DOCENTE,
      );
      expect(dialogo(fixture)!.querySelector('form')).toBeNull();

      const reintentar = Array.from(dialogo(fixture)!.querySelectorAll('button')).find(
        (boton) => boton.textContent?.trim() === 'Reintentar',
      )!;
      reintentar.click();
      await fixture.whenStable();

      expect(dialogo(fixture)!.querySelector('#registro-materia')).not.toBeNull();
    });
  });

  describe('fecha bloqueada (SCRUM-185)', () => {
    /** El aviso rojo de arriba de la grilla, o `null`. */
    const aviso = (fixture: ComponentFixture<CalendarioExamenes>) =>
      raiz(fixture).querySelector<HTMLElement>('app-aviso-calendario');

    it('un día completo avisa que la fecha está bloqueada sin abrir el registro, y el aviso se va al seguir', async () => {
      const fixture = await montar(() => of(OCTUBRE));

      await elegirDia(fixture, '2026-10-20');

      const bloqueo = aviso(fixture)!;
      expect(bloqueo.querySelector('[role="alert"]')).not.toBeNull();
      expect(bloqueo.textContent).toContain('20 de octubre · Fecha bloqueada');
      expect(bloqueo.textContent).toContain(
        'Ya se completó el máximo de parciales por día. Elegí otra fecha.',
      );
      expect(dialogo(fixture)).toBeNull();
      // Está arriba de la grilla, y el día completo se sigue leyendo como completo.
      expect(
        bloqueo.compareDocumentPosition(raiz(fixture).querySelector('table')!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(celda(fixture, '2026-10-20').getAttribute('aria-label')).toContain('completo');

      // Cambiar de mes lo saca.
      await tocar(fixture, 'button[aria-label="Mes siguiente"]');
      await tocar(fixture, 'button[aria-label="Mes anterior"]');
      expect(aviso(fixture)).toBeNull();

      // Elegir un día disponible también (y abre el registro, que sí corresponde).
      await elegirDia(fixture, '2026-10-20');
      expect(aviso(fixture)).not.toBeNull();
      await elegirDia(fixture, '2026-10-14');
      expect(aviso(fixture)).toBeNull();
      expect(dialogo(fixture)).not.toBeNull();
    });

    it('un día completo que ya pasó no dice nada, y Secretaría y Dirección no lo ven', async () => {
      const fixture = await montar(() =>
        of(
          mes(2026, 10, [
            { fecha: '2026-10-06T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
            { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
          ]),
        ),
      );

      await elegirDia(fixture, '2026-10-06');
      expect(aviso(fixture)).toBeNull();

      sesion.set(sesionDe('Secretario'));
      await fixture.whenStable();
      await elegirDia(fixture, '2026-10-20');
      expect(aviso(fixture)).toBeNull();
      expect(dialogo(fixture)).toBeNull();
    });
  });

  describe('modificar y eliminar un parcial (SCRUM-184, Docente)', () => {
    /** Toca el parcial de una celda como lo haría una persona: lo enfoca y lo aprieta. */
    async function abrirParcial(fixture: ComponentFixture<CalendarioExamenes>, fecha: string) {
      const boton = celda(fixture, fecha).querySelector<HTMLButtonElement>('button')!;
      boton.focus();
      boton.click();
      await fixture.whenStable();
    }

    /** El botón con ese texto, dentro de un contenedor. */
    const botonDe = (contenedor: Element, texto: string) =>
      Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button')).find(
        (boton) => boton.textContent?.trim() === texto,
      )!;

    const montarConUnParcial = (servicio: ServicioDeRegistro = {}) =>
      montar(
        () => of(OCTUBRE),
        () => of([PARCIAL_DEL_13]),
        servicio,
      );

    it('al tocar un parcial abre "Modificar parcial" con su resumen y fecha y hora precargadas, y Guardar espera un cambio', async () => {
      const fixture = await montarConUnParcial();

      await abrirParcial(fixture, '2026-10-13');

      const modal = dialogo(fixture)!;
      expect(modal.querySelector('h2')?.textContent).toContain('Modificar parcial');
      expect(modal.textContent).toContain('Martes 13 de octubre de 2026');
      // La materia, la comisión y el tipo se leen pero no se editan: el backend no los cambia.
      expect(modal.textContent).toContain('Matemática');
      expect(modal.textContent).toContain('Comisión 1° A');
      expect(modal.textContent).toContain('Parcial');
      expect(modal.querySelector('select')).toBeNull();
      expect(modal.contains(document.activeElement)).toBe(true);

      const fecha = modal.querySelector<HTMLInputElement>('#modificacion-fecha')!;
      expect(fecha.type).toBe('date');
      expect(fecha.value).toBe('2026-10-13');
      expect(fecha.getAttribute('min')).toBe('2026-10-10');
      expect(modal.querySelector<HTMLInputElement>('#modificacion-horario')?.value).toBe('14:00');

      // Sin cambios no hay nada que guardar.
      const guardar = modal.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      expect(guardar.disabled).toBe(true);
      await guardarRegistro(fixture);
      expect(reprogramados).toEqual([]);

      escribir(fixture, '#modificacion-horario', '15:30');
      await fixture.whenStable();
      expect(guardar.disabled).toBe(false);

      // Una fecha pasada no se guarda, y dice por qué.
      escribir(fixture, '#modificacion-fecha', '2026-10-09');
      await guardarRegistro(fixture);
      expect(modal.querySelector('form [role="alert"]')?.textContent).toContain(
        'no puede ser anterior a hoy',
      );
      expect(reprogramados).toEqual([]);
    });

    it('Guardar reprograma con la fecha armada sin pasar por UTC, avisa, vuelve a pedir el mes y deja el foco en el día', async () => {
      const fixture = await montarConUnParcial();
      await abrirParcial(fixture, '2026-10-13');

      escribir(fixture, '#modificacion-fecha', '2026-10-14');
      escribir(fixture, '#modificacion-horario', '23:30');
      await guardarRegistro(fixture);

      expect(reprogramados).toEqual([{ idExamen: 1, fechaYHora: '2026-10-14T23:30:00' }]);
      expect(dialogo(fixture)).toBeNull();
      expect(raiz(fixture).querySelector('p[role="status"]')?.textContent).toContain(
        'Parcial reprogramado para el miércoles 14 de octubre a las 23:30.',
      );
      // Se pidió otra vez el mes, sin tapar la grilla, y el foco quedó en el día nuevo.
      expect(pedidos).toEqual([
        [2026, 10],
        [2026, 10],
      ]);
      expect(document.activeElement).toBe(celda(fixture, '2026-10-14'));
    });

    it('si el backend rechaza la nueva fecha (400), su mensaje queda dentro del formulario y el modal sigue abierto', async () => {
      const rechazo = 'No se puede reprogramar. El día ha superado el límite de parciales.';
      const fixture = await montarConUnParcial({
        reprogramarExamen: () => throwError(() => new Error(rechazo)),
      });
      await abrirParcial(fixture, '2026-10-13');

      escribir(fixture, '#modificacion-fecha', '2026-10-20');
      await guardarRegistro(fixture);

      const modal = dialogo(fixture)!;
      expect(modal.querySelector('form [role="alert"]')?.textContent).toContain(rechazo);
      expect(modal.querySelector<HTMLInputElement>('#modificacion-fecha')?.value).toBe(
        '2026-10-20',
      );
      expect(raiz(fixture).querySelector('p[role="status"]')).toBeNull();
    });

    it('eliminar pide confirmación y recién al confirmar llama al servicio', async () => {
      const fixture = await montarConUnParcial();
      await abrirParcial(fixture, '2026-10-13');

      const eliminar = botonDe(dialogo(fixture)!, 'Eliminar parcial');
      eliminar.focus();
      eliminar.click();
      await fixture.whenStable();

      const confirmacion = raiz(fixture).querySelector<HTMLElement>('[role="alertdialog"]')!;
      expect(confirmacion.textContent).toContain(
        '¿Eliminar el parcial de Matemática del martes 13 de octubre?',
      );
      expect(eliminados).toEqual([]);

      // Cancelar no borra nada, deja el modal y el foco donde estaba.
      botonDe(confirmacion, 'Cancelar').click();
      await fixture.whenStable();
      expect(raiz(fixture).querySelector('[role="alertdialog"]')).toBeNull();
      expect(dialogo(fixture)).not.toBeNull();
      expect(eliminados).toEqual([]);
      expect(document.activeElement).toBe(eliminar);

      eliminar.click();
      await fixture.whenStable();
      botonDe(
        raiz(fixture).querySelector<HTMLElement>('[role="alertdialog"]')!,
        'Eliminar',
      ).click();
      await fixture.whenStable();

      expect(eliminados).toEqual([1]);
      expect(dialogo(fixture)).toBeNull();
      expect(raiz(fixture).querySelector('p[role="status"]')?.textContent).toContain(
        'Parcial de Matemática del martes 13 de octubre eliminado.',
      );
      expect(pedidos).toHaveLength(2);
      expect(document.activeElement).toBe(celda(fixture, '2026-10-13'));
    });
  });

  describe('arrastrar un parcial a otro día (SCRUM-184, Docente)', () => {
    it('soltarlo en un día disponible lo reprograma con su mismo horario, y si el backend rechaza lo dice arriba de la grilla', async () => {
      const rechazo = 'No se puede reprogramar. El día ha superado el límite de parciales.';
      const fixture = await montar(
        () => of(OCTUBRE),
        () => of([PARCIAL_DEL_13]),
        {
          reprogramarExamen: (_id, fechaYHora) =>
            fechaYHora.startsWith('2026-10-16')
              ? throwError(() => new Error(rechazo))
              : of(undefined),
        },
      );

      /** Agarra el parcial del 13 y lo suelta sobre una fecha. */
      const arrastrarA = async (fecha: string) => {
        celda(fixture, '2026-10-13')
          .querySelector('[draggable="true"]')!
          .dispatchEvent(new Event('dragstart', { bubbles: true }));
        await fixture.whenStable();
        celda(fixture, fecha).dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
        await fixture.whenStable();
      };

      // Un día completo y el mismo día no lo reciben.
      await arrastrarA('2026-10-20');
      await arrastrarA('2026-10-13');
      expect(reprogramados).toEqual([]);

      await arrastrarA('2026-10-15');
      expect(reprogramados).toEqual([{ idExamen: 1, fechaYHora: '2026-10-15T14:00:00' }]);
      expect(raiz(fixture).querySelector('p[role="status"]')?.textContent).toContain(
        'Parcial reprogramado para el jueves 15 de octubre a las 14:00.',
      );
      expect(pedidos).toHaveLength(2);

      await arrastrarA('2026-10-16');
      const alerta = raiz(fixture).querySelector<HTMLElement>('app-aviso-calendario')!;
      expect(alerta.textContent).toContain('No se pudo mover el parcial');
      expect(alerta.textContent).toContain(rechazo);
      expect(raiz(fixture).querySelector('p[role="status"]')).toBeNull();
      expect(dialogo(fixture)).toBeNull();
    });
  });
});
