import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevaMesa } from '../../../../../core/mesas/modelos/nueva-mesa';
import { MENSAJE_DOCENTE_REPETIDO } from '../../../../../core/mesas/nueva-mesa';
import { FormularioMesa } from './formulario-mesa';

describe('FormularioMesa (SCRUM-245)', () => {
  let fixture: ComponentFixture<FormularioMesa>;
  let emitida: NuevaMesa | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormularioMesa] }).compileComponents();
    fixture = TestBed.createComponent(FormularioMesa);
    emitida = null;
    fixture.componentInstance.guardar.subscribe((mesa) => (emitida = mesa));
    fixture.componentRef.setInput('hoy', new Date(2026, 9, 10));
    fixture.componentRef.setInput('materias', [{ idMateria: 4, nombre: 'Redes' }]);
    fixture.componentRef.setInput('docentes', [
      { idDocente: 8, nombreCompleto: 'Ana Pérez' },
      { idDocente: 9, nombreCompleto: 'Bruno Gómez' },
      { idDocente: 10, nombreCompleto: 'Carla Ruiz' },
    ]);
    await fixture.whenStable();
  });

  function raiz(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function completar(campo: string, valor: string): void {
    const control = raiz().querySelector<HTMLInputElement | HTMLSelectElement>(`#${campo}`)!;
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  async function enviar(): Promise<void> {
    raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function completarTodo(): void {
    completar('mesa-dia', '2026-11-20');
    completar('mesa-horario', '09:00');
    completar('mesa-materia', '4');
    completar('mesa-docente', '8');
    completar('mesa-vocal-1', '9');
    completar('mesa-vocal-2', '10');
  }

  it('emite la mesa con el tribunal y los ids como números', async () => {
    completarTodo();
    await enviar();

    expect(emitida).toEqual({
      dia: '2026-11-20',
      horario: '09:00',
      idMateria: 4,
      idDocente: 8,
      idVocal1: 9,
      idVocal2: 10,
    });
  });

  it('no deja repetir un docente en el tribunal', async () => {
    completarTodo();
    completar('mesa-vocal-2', '8');
    await enviar();

    expect(emitida).toBeNull();
    expect(raiz().textContent).toContain(MENSAJE_DOCENTE_REPETIDO);
  });

  it('no pide comisión ni tipo: la mesa es de la materia para todas sus comisiones', () => {
    expect(raiz().querySelector('#mesa-comision')).toBeNull();
    expect(raiz().querySelector('#mesa-tipo')).toBeNull();
    expect(raiz().querySelector('#ayuda-mesa-materia')?.textContent).toContain(
      'todas las comisiones',
    );
  });

  it('vacío no emite y muestra qué falta', async () => {
    await enviar();

    expect(emitida).toBeNull();
    expect(raiz().textContent).toContain('Elegí la fecha de la mesa.');
    expect(raiz().textContent).toContain('Elegí el docente que la preside.');
    expect(raiz().textContent).toContain('Elegí el vocal 1.');
    expect(raiz().textContent).toContain('Elegí el vocal 2.');
  });

  it('no deja una fecha anterior a hoy', async () => {
    completar('mesa-dia', '2026-10-01');
    await enviar();

    expect(emitida).toBeNull();
    expect(raiz().textContent).toContain('La fecha no puede ser anterior a hoy.');
  });
});
