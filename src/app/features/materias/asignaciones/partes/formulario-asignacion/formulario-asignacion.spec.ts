import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AsignacionMateria } from '../../../../../core/materias/modelos/asignacion-materia';
import { FormularioAsignacion } from './formulario-asignacion';

describe('FormularioAsignacion', () => {
  let fixture: ComponentFixture<FormularioAsignacion>;
  let componente: any;
  let emitida: AsignacionMateria | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormularioAsignacion] }).compileComponents();
    fixture = TestBed.createComponent(FormularioAsignacion);
    componente = fixture.componentInstance;
    emitida = null;
    fixture.componentInstance.asignar.subscribe((a) => (emitida = a));
    fixture.componentRef.setInput('docentes', [{ idDocente: 2, nombreCompleto: 'Ana Pérez' }]);
    fixture.componentRef.setInput('materias', [{ idMateria: 14, nombre: 'Didáctica General' }]);
    fixture.componentRef.setInput('comisiones', [{ idComision: 1, nombre: 'Comisión A' }]);
    await fixture.whenStable();
  });

  function opciones(id: string): string[][] {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(`#${id}`);
    return Array.from(select.options).map((o) => [o.value, o.text.trim()]);
  }

  it('los tres desplegables usan los ids reales como value', () => {
    expect(opciones('asignacion-docente')).toContainEqual(['2', 'Ana Pérez']);
    expect(opciones('asignacion-materia')).toContainEqual(['14', 'Didáctica General']);
    expect(opciones('asignacion-comision')).toContainEqual(['1', 'Comisión A']);
  });

  it('emite los tres ids como números', () => {
    componente.formulario.setValue({ idDocente: '2', idMateria: '14', idComision: '1' });
    componente.enviar();

    expect(emitida).toEqual({ idDocente: 2, idMateria: 14, idComision: 1 });
  });

  it('no emite si falta elegir algo', async () => {
    componente.formulario.setValue({ idDocente: '2', idMateria: '', idComision: '1' });
    componente.enviar();
    await fixture.whenStable();

    expect(emitida).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Elegí la materia.');
  });

  it('si no hay docentes cargados lo explica', async () => {
    fixture.componentRef.setInput('docentes', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay docentes');
  });
});
