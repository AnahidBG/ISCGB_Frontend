import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevaMateria } from '../../../../../core/materias/modelos/asignacion-materia';
import { FormularioNuevaMateria } from './formulario-nueva-materia';

const CURSOS = ['Primer Año', 'Segundo Año', 'Tercer Año'];

describe('FormularioNuevaMateria', () => {
  let fixture: ComponentFixture<FormularioNuevaMateria>;
  let componente: any;
  let emitida: NuevaMateria | null;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormularioNuevaMateria] }).compileComponents();
    fixture = TestBed.createComponent(FormularioNuevaMateria);
    componente = fixture.componentInstance;
    emitida = null;
    fixture.componentRef.setInput('cursos', CURSOS);
    fixture.componentInstance.guardar.subscribe((m) => (emitida = m));
    await fixture.whenStable();
  });

  it('emite la materia con los textos sin espacios de más', () => {
    componente.formulario.setValue({
      nombre: '  Didáctica General ',
      carrera: 'Profesorado de Inglés',
      curso: 'Primer Año',
    });
    componente.enviar();

    expect(emitida).toEqual({
      nombre: 'Didáctica General',
      carrera: 'Profesorado de Inglés',
      curso: 'Primer Año',
    });
  });

  it('el curso se elige de un desplegable con los cursos del backend, no se escribe', () => {
    const curso: HTMLSelectElement | null = fixture.nativeElement.querySelector('#materia-curso');

    expect(curso?.tagName).toBe('SELECT');
    const opciones = Array.from(curso!.options).map((opcion) => opcion.textContent?.trim());
    expect(opciones).toEqual(['Elegí el curso', ...CURSOS]);
  });

  it('no emite un curso que no está en la lista (el backend lo rechaza)', async () => {
    componente.formulario.setValue({ nombre: 'Pedagogía', carrera: 'Profesorado', curso: '1° año' });
    componente.enviar();
    await fixture.whenStable();

    expect(emitida).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Elegí el curso.');
  });

  it('no emite si falta algo (los tres son obligatorios en el backend)', async () => {
    componente.formulario.setValue({ nombre: 'Pedagogía', carrera: '   ', curso: 'Primer Año' });
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
