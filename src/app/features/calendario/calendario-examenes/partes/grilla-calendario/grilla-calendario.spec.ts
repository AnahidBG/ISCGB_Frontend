import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { aCalendarioDelMes } from '../../../../../core/examenes/adaptador-estado-mes';
import { DiaCalendario } from '../../../../../core/examenes/modelos/dia-calendario';
import { GrillaCalendario } from './grilla-calendario';

registerLocaleData(localeEsAr);

/** Octubre de 2026: un parcial el 21 y el límite alcanzado el 20. Hoy es sábado 10. */
const OCTUBRE = aCalendarioDelMes(
  {
    limiteDiario: 2,
    diasOcupados: [
      { fecha: '2026-10-20T00:00:00', cantidadExamenes: 2, limiteAlcanzado: true },
      { fecha: '2026-10-21T00:00:00', cantidadExamenes: 1, limiteAlcanzado: false },
    ],
  },
  { anio: 2026, mes: 10 },
);

async function montar(seleccionable: boolean): Promise<{
  fixture: ComponentFixture<GrillaCalendario>;
  elegidos: DiaCalendario[];
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-AR' }] });
  const fixture = TestBed.createComponent(GrillaCalendario);
  fixture.componentRef.setInput('mes', { anio: 2026, mes: 10 });
  fixture.componentRef.setInput('dias', OCTUBRE.dias);
  fixture.componentRef.setInput('hoy', new Date(2026, 9, 10));
  fixture.componentRef.setInput('seleccionable', seleccionable);

  const elegidos: DiaCalendario[] = [];
  fixture.componentInstance.diaSeleccionado.subscribe((dia) => elegidos.push(dia));
  await fixture.whenStable();
  return { fixture, elegidos };
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

  it('un día pasado o completo no se puede elegir, y sin habilitar la selección ninguno', async () => {
    const { fixture, elegidos } = await montar(false);

    // Por defecto la selección está deshabilitada: ningún día emite.
    celda(fixture, '2026-10-21').click();
    expect(elegidos).toEqual([]);

    fixture.componentRef.setInput('seleccionable', true);
    await fixture.whenStable();

    // Un día pasado y uno completo: ni con clic ni con Enter ni con Espacio.
    celda(fixture, '2026-10-05').click();
    await teclear(fixture, '2026-10-20', 'Enter');
    await teclear(fixture, '2026-10-20', ' ');
    expect(elegidos).toEqual([]);
    expect(celda(fixture, '2026-10-05').getAttribute('aria-disabled')).toBe('true');
    expect(celda(fixture, '2026-10-20').getAttribute('aria-disabled')).toBe('true');

    // Hoy y los días que vienen sí.
    celda(fixture, '2026-10-21').click();
    await teclear(fixture, '2026-10-22', 'Enter');
    expect(elegidos.map((dia) => dia.fecha)).toEqual(['2026-10-21', '2026-10-22']);
    expect(celda(fixture, '2026-10-21').getAttribute('aria-disabled')).toBeNull();
  });
});
