import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { aCalendarioDelMes } from '../../../../../core/examenes/adaptador-estado-mes';
import { DiaCalendario } from '../../../../../core/examenes/modelos/dia-calendario';
import { ExamenCalendario } from '../../../../../core/examenes/modelos/examen-calendario';
import { GrillaCalendario } from './grilla-calendario';

registerLocaleData(localeEsAr);

/**
 * Octubre de 2026: un parcial el 21, el límite alcanzado el 20 (de acá en adelante)
 * y el 7 (ya pasado). Hoy es sábado 10.
 */
const OCTUBRE = aCalendarioDelMes(
  {
    limiteDiario: 2,
    diasOcupados: [
      { fecha: '2026-10-07T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
      { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
      { fecha: '2026-10-21T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
    ],
  },
  { anio: 2026, mes: 10 },
);

const PARCIAL_DEL_21: ExamenCalendario = {
  idExamen: 4,
  fecha: '2026-10-21',
  horario: '10:00',
  materia: 'Pedagogía',
  comision: 'Comisión 2° A',
  tipo: 'Parcial',
};

/** Un parcial que ya pasó: no se arrastra. */
const PARCIAL_DEL_5: ExamenCalendario = { ...PARCIAL_DEL_21, idExamen: 1, fecha: '2026-10-05' };

async function montar(seleccionable: boolean): Promise<{
  fixture: ComponentFixture<GrillaCalendario>;
  elegidos: DiaCalendario[];
  bloqueados: DiaCalendario[];
  movidos: { examen: ExamenCalendario; dia: DiaCalendario }[];
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }] });
  const fixture = TestBed.createComponent(GrillaCalendario);
  fixture.componentRef.setInput('mes', { anio: 2026, mes: 10 });
  fixture.componentRef.setInput('dias', OCTUBRE.dias);
  fixture.componentRef.setInput('hoy', new Date(2026, 9, 10));
  fixture.componentRef.setInput('seleccionable', seleccionable);

  const elegidos: DiaCalendario[] = [];
  const bloqueados: DiaCalendario[] = [];
  const movidos: { examen: ExamenCalendario; dia: DiaCalendario }[] = [];
  fixture.componentInstance.diaSeleccionado.subscribe((dia) => elegidos.push(dia));
  fixture.componentInstance.diaBloqueado.subscribe((dia) => bloqueados.push(dia));
  fixture.componentInstance.examenMovido.subscribe((movimiento) => movidos.push(movimiento));
  await fixture.whenStable();
  return { fixture, elegidos, bloqueados, movidos };
}

function celda(fixture: ComponentFixture<GrillaCalendario>, fecha: string): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `td[data-fecha="${fecha}"]`,
  )!;
}

async function teclear(
  fixture: ComponentFixture<GrillaCalendario>,
  fecha: string,
  key: string,
): Promise<void> {
  celda(fixture, fecha).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  await fixture.whenStable();
}

describe('GrillaCalendario', () => {
  it('se recorre con las flechas y toda la grilla es una sola parada de tabulación', async () => {
    const { fixture } = await montar(false);
    const paradas = () =>
      Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('td[tabindex="0"]'),
      ).map((td) => td.dataset['fecha']);

    // Arranca en hoy, y es la única celda que se alcanza con Tab.
    expect(paradas()).toEqual(['2026-10-10']);

    // Derecha: un día. Abajo: una semana. Izquierda y arriba, al revés.
    await teclear(fixture, '2026-10-10', 'ArrowRight');
    expect(document.activeElement).toBe(celda(fixture, '2026-10-11'));
    expect(paradas()).toEqual(['2026-10-11']);

    await teclear(fixture, '2026-10-11', 'ArrowDown');
    expect(document.activeElement).toBe(celda(fixture, '2026-10-18'));

    await teclear(fixture, '2026-10-18', 'ArrowLeft');
    expect(document.activeElement).toBe(celda(fixture, '2026-10-17'));

    await teclear(fixture, '2026-10-17', 'ArrowUp');
    expect(document.activeElement).toBe(celda(fixture, '2026-10-10'));
    expect(paradas()).toEqual(['2026-10-10']);

    // En la punta del mes se queda: no pasa a un día de relleno.
    await teclear(fixture, '2026-10-10', 'ArrowDown');
    await teclear(fixture, '2026-10-17', 'ArrowDown');
    await teclear(fixture, '2026-10-24', 'ArrowDown');
    await teclear(fixture, '2026-10-31', 'ArrowRight');
    expect(document.activeElement).toBe(celda(fixture, '2026-10-31'));
  });

  it('un día pasado o completo no se puede elegir, y uno completo que no pasó avisa que está bloqueado', async () => {
    const { fixture, elegidos, bloqueados } = await montar(false);

    // Por defecto la selección está deshabilitada: ningún día emite, ni elige ni avisa.
    celda(fixture, '2026-10-21').click();
    celda(fixture, '2026-10-20').click();
    expect(elegidos).toEqual([]);
    expect(bloqueados).toEqual([]);

    fixture.componentRef.setInput('seleccionable', true);
    await fixture.whenStable();

    // Un día pasado, completo o no, no hace nada.
    celda(fixture, '2026-10-05').click();
    celda(fixture, '2026-10-07').click();
    await teclear(fixture, '2026-10-07', 'Enter');
    expect(elegidos).toEqual([]);
    expect(bloqueados).toEqual([]);

    // Uno completo que no pasó no se elige, pero con clic, Enter o Espacio avisa que está bloqueado.
    celda(fixture, '2026-10-20').click();
    await teclear(fixture, '2026-10-20', 'Enter');
    await teclear(fixture, '2026-10-20', ' ');
    expect(elegidos).toEqual([]);
    expect(bloqueados.map((dia) => dia.fecha)).toEqual(['2026-10-20', '2026-10-20', '2026-10-20']);
    expect(celda(fixture, '2026-10-05').getAttribute('aria-disabled')).toBe('true');
    expect(celda(fixture, '2026-10-20').getAttribute('aria-disabled')).toBe('true');
    // Sigue en el recorrido del teclado y se lee como completo.
    expect(celda(fixture, '2026-10-20').getAttribute('tabindex')).not.toBeNull();
    expect(celda(fixture, '2026-10-20').getAttribute('aria-label')).toContain('completo');

    // Hoy y los días que vienen sí se eligen.
    celda(fixture, '2026-10-21').click();
    await teclear(fixture, '2026-10-22', 'Enter');
    expect(elegidos.map((dia) => dia.fecha)).toEqual(['2026-10-21', '2026-10-22']);
    expect(celda(fixture, '2026-10-21').getAttribute('aria-disabled')).toBeNull();
  });

  it('un parcial se arrastra a un día que lo admita, y a ningún otro', async () => {
    const { fixture, movidos } = await montar(true);
    fixture.componentRef.setInput('examenes', [PARCIAL_DEL_21, PARCIAL_DEL_5]);
    fixture.componentRef.setInput('arrastrable', true);
    await fixture.whenStable();

    // Solo el parcial que no pasó se puede agarrar.
    const agarrables = (fixture.nativeElement as HTMLElement).querySelectorAll(
      '[draggable="true"]',
    );
    expect(agarrables).toHaveLength(1);
    expect(celda(fixture, '2026-10-21').contains(agarrables[0])).toBe(true);

    // jsdom no trae `DataTransfer`: el parcial arrastrado vive en el estado de la grilla.
    agarrables[0].dispatchEvent(new Event('dragstart', { bubbles: true }));
    await fixture.whenStable();

    // Se marcan los días que lo admiten: ni el mismo día, ni uno completo, ni uno pasado.
    const marcados = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('td[data-destino="true"]'),
    ).map((td) => td.getAttribute('data-fecha'));
    expect(marcados).toContain('2026-10-22');
    expect(marcados).not.toContain('2026-10-21');
    expect(marcados).not.toContain('2026-10-20');
    expect(marcados).not.toContain('2026-10-05');

    // `dragover` solo se acepta (se le hace `preventDefault`) donde se puede soltar.
    const arrastrarSobre = (fecha: string) => {
      const evento = new Event('dragover', { bubbles: true, cancelable: true });
      celda(fixture, fecha).dispatchEvent(evento);
      return evento.defaultPrevented;
    };
    expect(arrastrarSobre('2026-10-22')).toBe(true);
    expect(arrastrarSobre('2026-10-20')).toBe(false);

    const soltarEn = async (fecha: string) => {
      celda(fixture, fecha).dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };
    await soltarEn('2026-10-20');
    await soltarEn('2026-10-21');
    await soltarEn('2026-10-05');
    expect(movidos).toEqual([]);

    await soltarEn('2026-10-22');
    expect(movidos).toHaveLength(1);
    expect(movidos[0].examen).toEqual(PARCIAL_DEL_21);
    expect(movidos[0].dia.fecha).toBe('2026-10-22');
    // Al soltar se limpian las marcas.
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[data-destino="true"]'),
    ).toBeNull();
  });
});
