import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InscripcionAlumno } from '../../../../../core/materias/modelos/asignacion-materia';
import { FormularioInscripcion } from './formulario-inscripcion';

describe('FormularioInscripcion (SCRUM-248)', () => {
  let fixture: ComponentFixture<FormularioInscripcion>;
  let componente: any;
  let emitida: InscripcionAlumno | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormularioInscripcion] }).compileComponents();
    fixture = TestBed.createComponent(FormularioInscripcion);
    componente = fixture.componentInstance;
    emitida = null;
    fixture.componentInstance.inscribir.subscribe((i) => (emitida = i));
    fixture.componentRef.setInput('alumnos', [
      { idAlumno: 3, nombreCompleto: 'Gómez, Juan (Legajo: 1203)' },
    ]);
    fixture.componentRef.setInput('materias', [{ idMateria: 14, nombre: 'Didáctica General' }]);
    fixture.componentRef.setInput('comisiones', [{ idComision: 1, nombre: 'Comisión A' }]);
    await fixture.whenStable();
  });

  function opciones(id: string): string[][] {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(`#${id}`);
    return Array.from(select.options).map((o) => [o.value, o.text.trim()]);
  }

  it('los tres desplegables usan los ids reales como value', () => {
    expect(opciones('inscripcion-alumno')).toContainEqual(['3', 'Gómez, Juan (Legajo: 1203)']);
    expect(opciones('inscripcion-materia')).toContainEqual(['14', 'Didáctica General']);
    expect(opciones('inscripcion-comision')).toContainEqual(['1', 'Comisión A']);
  });

  it('emite los tres ids como números', () => {
    componente.formulario.setValue({ idAlumno: '3', idMateria: '14', idComision: '1' });
    componente.enviar();

    expect(emitida).toEqual({ idAlumno: 3, idMateria: 14, idComision: 1 });
  });

  it('no emite si falta elegir algo', async () => {
    componente.formulario.setValue({ idAlumno: '', idMateria: '14', idComision: '1' });
    componente.enviar();
    await fixture.whenStable();

    expect(emitida).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Elegí el alumno.');
  });

  it('si no hay alumnos cargados lo explica', async () => {
    fixture.componentRef.setInput('alumnos', []);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Todavía no hay alumnos');
  });
});
