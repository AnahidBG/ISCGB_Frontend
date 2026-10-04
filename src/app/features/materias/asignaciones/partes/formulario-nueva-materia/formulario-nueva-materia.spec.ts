import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevaMateria } from '../../../../../core/materias/modelos/asignacion-materia';
import { FormularioNuevaMateria } from './formulario-nueva-materia';

describe('FormularioNuevaMateria', () => {
  let fixture: ComponentFixture<FormularioNuevaMateria>;
  let componente: any;
  let emitida: NuevaMateria | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormularioNuevaMateria] }).compileComponents();
    fixture = TestBed.createComponent(FormularioNuevaMateria);
    componente = fixture.componentInstance;
    emitida = null;
    fixture.componentInstance.guardar.subscribe((m) => (emitida = m));
    await fixture.whenStable();
  });

  it('emite la materia con los textos sin espacios de más', () => {
    componente.formulario.setValue({
      nombre: '  Didáctica General ',
      carrera: 'Profesorado de Inglés',
      curso: ' 1° ',
    });
    componente.enviar();

    expect(emitida).toEqual({
      nombre: 'Didáctica General',
      carrera: 'Profesorado de Inglés',
      curso: '1°',
    });
  });

  it('no emite si falta algo (los tres son obligatorios en el backend)', async () => {
    componente.formulario.setValue({ nombre: 'Pedagogía', carrera: '   ', curso: '1°' });
    componente.enviar();
    await fixture.whenStable();

    expect(emitida).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Ingresá la carrera.');
  });

  it('cuando el contenedor pide reiniciar, queda vacío y sin errores', async () => {
    componente.formulario.setValue({ nombre: 'Pedagogía', carrera: '', curso: '' });
    componente.enviar();

    fixture.componentRef.setInput('reinicio', 1);
    await fixture.whenStable();

    expect(componente.formulario.getRawValue()).toEqual({ nombre: '', carrera: '', curso: '' });
    expect(fixture.nativeElement.textContent).not.toContain('Ingresá la carrera.');
  });
});
