import { MateriaDelAlumno, etiquetaDeMateriaDelAlumno } from './materia-del-alumno';

describe('etiquetaDeMateriaDelAlumno', () => {
  const materia: MateriaDelAlumno = {
    idMateria: 3,
    nombre: 'Programación I',
    carrera: 'Tecnicatura en Desarrollo de Software',
    curso: 'Primer Año',
  };

  it('con carrera y curso los muestra entre paréntesis, separados por un punto medio', () => {
    expect(etiquetaDeMateriaDelAlumno(materia)).toBe(
      'Programación I (Tecnicatura en Desarrollo de Software · Primer Año)',
    );
  });

  it('sin carrera muestra solo el curso, sin separadores colgando', () => {
    expect(etiquetaDeMateriaDelAlumno({ ...materia, carrera: null })).toBe(
      'Programación I (Primer Año)',
    );
  });

  it('sin curso muestra solo la carrera', () => {
    expect(etiquetaDeMateriaDelAlumno({ ...materia, curso: null })).toBe(
      'Programación I (Tecnicatura en Desarrollo de Software)',
    );
  });

  it('sin ninguno de los dos queda solo el nombre, sin paréntesis vacíos', () => {
    expect(etiquetaDeMateriaDelAlumno({ ...materia, carrera: null, curso: null })).toBe(
      'Programación I',
    );
  });
});
