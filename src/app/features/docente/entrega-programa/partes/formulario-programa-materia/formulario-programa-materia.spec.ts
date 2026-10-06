import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import { MateriaACargo } from '../../../../../core/programas-materia/modelos/contexto-docente';
import { ProgramaMateria } from '../../../../../core/programas-materia/modelos/programa-materia';
import { FormularioProgramaMateria } from './formulario-programa-materia';

/** Materia con los datos del plan de estudios cargados en `materias`. */
const CON_PLAN: MateriaACargo = {
  idMateria: 3,
  nombre: 'Programación I',
  carrera: 'Tecnicatura Superior en Desarrollo de Software',
  curso: 'Primer Año',
  idComision: 1,
  nombreComision: 'A',
  formato: 'Asignatura',
  horasCatedra: 5,
  horasTotales: 107,
};

/** Materia sin esos datos: es lo que manda el backend hoy. */
const SIN_PLAN: MateriaACargo = {
  idMateria: 12,
  nombre: 'Psicología Educacional',
  carrera: null,
  curso: null,
  idComision: 4,
  nombreComision: 'Única',
  formato: null,
  horasCatedra: null,
  horasTotales: null,
};

describe('FormularioProgramaMateria', () => {
  let fixture: ComponentFixture<FormularioProgramaMateria>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(FormularioProgramaMateria);
    fixture.componentRef.setInput('idDocente', 2);
    fixture.componentRef.setInput('materias', [CON_PLAN, SIN_PLAN]);
    fixture.componentRef.setInput('nombreDocente', 'Milena Previgliano');
    await fixture.whenStable();
  });

  function campo<T extends HTMLElement>(id: string): T {
    return (fixture.nativeElement as HTMLElement).querySelector<T>(`#${id}`)!;
  }

  async function elegirMateria(idMateria: number): Promise<void> {
    const select = campo<HTMLSelectElement>('idMateria');
    select.value = String(idMateria);
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function valoresDeOpciones(id: string): string[] {
    return Array.from(campo<HTMLSelectElement>(id).options).map((o) => o.value);
  }

  it('condición y formato tienen las opciones que pidió Secretaría', () => {
    expect(valoresDeOpciones('condicion')).toEqual(['', 'Regular', 'Promoción']);
    expect(valoresDeOpciones('formatoCurricular')).toEqual([
      '',
      'Asignatura',
      'Taller',
      'Módulo teórico',
      'Módulo aplicado',
    ]);
  });

  it('al elegir una materia con datos del plan, completa formato y horas y no deja editarlos', async () => {
    await elegirMateria(CON_PLAN.idMateria);

    expect(campo<HTMLSelectElement>('formatoCurricular').value).toBe('Asignatura');
    expect(campo<HTMLSelectElement>('formatoCurricular').disabled).toBe(true);
    expect(campo<HTMLInputElement>('horasSemanales').value).toBe('5');
    expect(campo<HTMLInputElement>('horasSemanales').disabled).toBe(true);
    expect(campo<HTMLInputElement>('horasCuatrimestrales').value).toBe('107');
    expect(campo<HTMLInputElement>('horasCuatrimestrales').disabled).toBe(true);
  });

  it('si la materia no trae esos datos, quedan para cargar a mano', async () => {
    await elegirMateria(SIN_PLAN.idMateria);

    expect(campo<HTMLSelectElement>('formatoCurricular').disabled).toBe(false);
    expect(campo<HTMLInputElement>('horasSemanales').disabled).toBe(false);
    expect(campo<HTMLInputElement>('horasCuatrimestrales').disabled).toBe(false);
  });

  it('al pasar a una materia sin datos, borra lo que se había autocompletado', async () => {
    await elegirMateria(CON_PLAN.idMateria);
    await elegirMateria(SIN_PLAN.idMateria);

    expect(campo<HTMLSelectElement>('formatoCurricular').value).toBe('');
    expect(campo<HTMLInputElement>('horasSemanales').value).toBe('');
    expect(campo<HTMLInputElement>('horasCuatrimestrales').value).toBe('');
  });

  /**
   * La ficha de solo lectura con los datos de la materia. Se busca por su
   * nombre accesible y no por el texto de toda la pantalla: la carrera y el
   * curso también aparecen en la etiqueta de las opciones del `<select>`.
   */
  function ficha(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[aria-label="Datos de la materia"]');
  }

  it('muestra carrera, curso y docente de la materia elegida', async () => {
    expect(ficha()).toBeNull();

    await elegirMateria(CON_PLAN.idMateria);

    expect(ficha()?.textContent).toContain('Tecnicatura Superior en Desarrollo de Software');
    expect(ficha()?.textContent).toContain('Primer Año');
    expect(ficha()?.textContent).toContain('Milena Previgliano');
  });

  it('si la materia no tiene carrera o curso cargados, lo dice', async () => {
    await elegirMateria(SIN_PLAN.idMateria);

    expect(ficha()?.textContent).toContain('Sin cargar');
  });

  it('lo autocompletado viaja en el programa que se envía', async () => {
    const enviados: ProgramaMateria[] = [];
    fixture.componentInstance.enviarPrograma.subscribe((p) => enviados.push(p));

    await elegirMateria(CON_PLAN.idMateria);
    const componente = fixture.componentInstance as unknown as {
      formulario: FormGroup;
      enviar(): void;
    };
    componente.formulario.patchValue({
      condicion: 'Regular',
      fundamentacion: 'f',
      objetivosGenerales: 'og',
      objetivosEspecificos: 'oe',
      contenidos: [{ tituloUnidad: 't', contenido: 'c', bibliografiaObligatoria: 'b' }],
      estrategiasMetodologicas: 'em',
      evaluacion: 'e',
      criteriosEvaluacion: 'ce',
      condicionRegular: 'cr',
      condicionPromocional: 'cp',
      condicionLibre: 'cl',
    });
    componente.enviar();

    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({
      idDocente: 2,
      idMateria: 3,
      formatoCurricular: 'Asignatura',
      horasSemanales: '5',
      horasCuatrimestrales: '107',
      condicion: 'Regular',
    });
  });

  it('avisa cuando la persona empieza a cargar algo', async () => {
    const avisos: boolean[] = [];
    fixture.componentInstance.cambiosSinEnviar.subscribe((v) => avisos.push(v));

    const fundamentacion = campo<HTMLTextAreaElement>('fundamentacion');
    fundamentacion.value = 'Esta materia…';
    fundamentacion.dispatchEvent(new Event('input'));

    expect(avisos.at(-1)).toBe(true);
  });
});
