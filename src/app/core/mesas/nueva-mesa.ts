import { errorDeDia, errorDeHorario } from '../examenes/registro-examen';
import { NuevaMesa } from './modelos/nueva-mesa';

/** Los campos del alta de una mesa. */
export type CampoNuevaMesa = keyof NuevaMesa;

/**
 * Lo que tiene el formulario, todo como texto: así lo entregan los `<select>`,
 * el `<input type="date">` y el `<input type="time">`. Un desplegable sin elegir
 * es `''`.
 */
export type ValoresNuevaMesa = Readonly<Record<CampoNuevaMesa, string>>;

/** Qué campos tienen un error y cuál es. Vacío (`{}`) si se puede guardar. */
export type ErroresNuevaMesa = Partial<Record<CampoNuevaMesa, string>>;

/** Lo que dice cada campo si quedó vacío. */
const VACIO: Readonly<Record<CampoNuevaMesa, string>> = {
  dia: 'Elegí la fecha de la mesa.',
  horario: 'Ingresá el horario de la mesa.',
  idMateria: 'Elegí la materia.',
  idDocente: 'Elegí el docente que la preside.',
  idVocal1: 'Elegí el vocal 1.',
  idVocal2: 'Elegí el vocal 2.',
};

/** Lo que dice un vocal que repite a otro integrante del tribunal. */
export const MENSAJE_DOCENTE_REPETIDO = 'Ese docente ya está en el tribunal: elegí otro.';

/**
 * Qué campos no se pueden guardar y por qué.
 *
 * Todos son obligatorios. La fecha no puede ser anterior a hoy y el horario
 * tiene que ser de 24 h: son las mismas reglas que el registro de un parcial
 * (`errorDeDia`, `errorDeHorario`), porque el backend no valida ninguna de las
 * dos. El tribunal son tres docentes distintos: el backend también lo valida,
 * pero así el error aparece en el campo antes de mandar nada.
 * Recibe `hoy` por parámetro para seguir siendo una función pura.
 */
export function erroresDeNuevaMesa(valores: ValoresNuevaMesa, hoy: Date): ErroresNuevaMesa {
  const errores: ErroresNuevaMesa = {};

  for (const campo of Object.keys(VACIO) as CampoNuevaMesa[]) {
    if (valores[campo] === '') {
      errores[campo] = VACIO[campo];
    }
  }

  const errorDia = valores.dia === '' ? null : errorDeDia(valores.dia, hoy);
  if (errorDia !== null) {
    errores.dia = errorDia;
  }
  const errorHora = valores.horario === '' ? null : errorDeHorario(valores.horario);
  if (errorHora !== null) {
    errores.horario = errorHora;
  }

  const { idDocente, idVocal1, idVocal2 } = valores;
  if (idVocal1 !== '' && idVocal1 === idDocente) {
    errores.idVocal1 = MENSAJE_DOCENTE_REPETIDO;
  }
  if (idVocal2 !== '' && (idVocal2 === idDocente || idVocal2 === idVocal1)) {
    errores.idVocal2 = MENSAJE_DOCENTE_REPETIDO;
  }
  return errores;
}

/** Los valores del formulario, ya validados, como la mesa que se manda al backend. */
export function aNuevaMesa(valores: ValoresNuevaMesa): NuevaMesa {
  return {
    dia: valores.dia,
    horario: valores.horario,
    idMateria: Number(valores.idMateria),
    idDocente: Number(valores.idDocente),
    idVocal1: Number(valores.idVocal1),
    idVocal2: Number(valores.idVocal2),
  };
}
