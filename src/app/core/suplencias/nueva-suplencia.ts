import { aFechaSola, desdeFechaSola } from '../comun/fechas';
import { NuevaSuplencia, ResultadoSuplencia } from './modelos/suplencia';

/** Los campos del formulario de una suplencia. */
export type CampoNuevaSuplencia = keyof NuevaSuplencia;

/**
 * Lo que tiene el formulario, todo como texto: así lo entregan el `<select>` y
 * los `<input type="date">`. Un campo sin completar es `''`.
 */
export type ValoresNuevaSuplencia = Readonly<Record<CampoNuevaSuplencia, string>>;

/** Qué campos tienen un error y cuál es. Vacío (`{}`) si se puede guardar. */
export type ErroresNuevaSuplencia = Partial<Record<CampoNuevaSuplencia, string>>;

/** Un día sin hora: "2026-11-02". */
const TEXTO_DE_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** `desdeFechaSola` normaliza "2026-02-30" a marzo: si la vuelta no da lo mismo, el día no existe. */
function esDiaValido(dia: string): boolean {
  const fecha = TEXTO_DE_DIA.test(dia) ? desdeFechaSola(dia) : null;
  return fecha !== null && aFechaSola(fecha) === dia;
}

/**
 * Qué campos no se pueden guardar y por qué.
 *
 * El docente y el inicio son obligatorios; el fin no, porque una suplencia
 * puede arrancar sin fecha de vuelta del titular. El inicio puede ser pasado: se
 * carga a veces cuando la suplencia ya empezó. El backend no valida ninguna fecha.
 */
export function erroresDeNuevaSuplencia(valores: ValoresNuevaSuplencia): ErroresNuevaSuplencia {
  const errores: ErroresNuevaSuplencia = {};

  if (valores.idDocente === '') {
    errores.idDocente = 'Elegí el docente.';
  }

  if (valores.desde === '') {
    errores.desde = 'Elegí desde cuándo es la suplencia.';
  } else if (!esDiaValido(valores.desde)) {
    errores.desde = 'La fecha no es válida.';
  }

  if (valores.hasta !== '') {
    if (!esDiaValido(valores.hasta)) {
      errores.hasta = 'La fecha no es válida.';
    } else if (errores.desde === undefined && valores.hasta < valores.desde) {
      // Las fechas "yyyy-MM-dd" se ordenan igual como texto que como fechas.
      errores.hasta = 'La suplencia no puede terminar antes de empezar.';
    }
  }
  return errores;
}

/** Los valores del formulario, ya validados, como la suplencia que se manda al backend. */
export function aNuevaSuplencia(valores: ValoresNuevaSuplencia): NuevaSuplencia {
  return {
    idDocente: Number(valores.idDocente),
    desde: valores.desde,
    hasta: valores.hasta === '' ? null : valores.hasta,
  };
}

/** "2026-11-02" → "02/11/2026". */
function enNumeros(dia: string): string {
  const [anio, mes, numero] = dia.split('-');
  return `${numero}/${mes}/${anio}`;
}

/**
 * Lo que se le muestra a Dirección o Secretaría después de guardar. La baja
 * cambia según cómo quedó la cuenta: el backend la desactiva si la persona solo
 * era Docente, y si tenía más roles le saca solo el de Docente.
 */
export function mensajeDeSuplencia(
  nombre: string,
  resultado: ResultadoSuplencia,
  suplencia?: NuevaSuplencia,
): string {
  if (resultado.esSuplente) {
    const periodo =
      suplencia === undefined
        ? ''
        : suplencia.hasta === null
          ? ` desde el ${enNumeros(suplencia.desde)}`
          : ` del ${enNumeros(suplencia.desde)} al ${enNumeros(suplencia.hasta)}`;
    return `${nombre} quedó como docente suplente${periodo}.`;
  }
  return resultado.cuentaActiva
    ? `${nombre} dejó de ser suplente: ya no entra como docente, pero conserva sus otros roles.`
    : `${nombre} dejó de ser suplente. Como no tenía otro rol, su cuenta quedó inactiva.`;
}
