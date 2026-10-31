import { aNombreDeArchivo, validarArchivoPdf } from '../comun/archivos';
import { NuevoContrato } from './modelos/contrato-alumno';

/** Los campos de la carga de un contrato. */
export type CampoNuevoContrato = keyof NuevoContrato;

/** Lo que tiene el formulario: el alumno y el nombre como texto, y el archivo elegido o `null`. */
export interface ValoresNuevoContrato {
  idUsuario: string;
  nombre: string;
  archivo: File | null;
}

/** Qué campos tienen un error y cuál es. Vacío (`{}`) si se puede guardar. */
export type ErroresNuevoContrato = Partial<Record<CampoNuevoContrato, string>>;

/** El largo que se le propone al backend para la columna del nombre. */
const LARGO_MAXIMO_NOMBRE = 100;

/**
 * Qué campos no se pueden guardar y por qué. Los tres son obligatorios y el
 * archivo tiene que ser un PDF: la misma regla que el resto del sistema
 * (`validarArchivoPdf`), aunque `zona-archivo` ya la haya revisado al elegirlo.
 */
export function erroresDeNuevoContrato(valores: ValoresNuevoContrato): ErroresNuevoContrato {
  const errores: ErroresNuevoContrato = {};

  if (valores.idUsuario === '') {
    errores.idUsuario = 'Elegí el alumno.';
  }

  const nombre = valores.nombre.trim();
  if (nombre === '') {
    errores.nombre = 'Escribí el nombre del contrato.';
  } else if (nombre.length > LARGO_MAXIMO_NOMBRE) {
    errores.nombre = `El nombre puede tener hasta ${LARGO_MAXIMO_NOMBRE} caracteres.`;
  }

  if (valores.archivo === null) {
    errores.archivo = 'Adjuntá el contrato en PDF.';
  } else {
    const errorArchivo = validarArchivoPdf(valores.archivo);
    if (errorArchivo !== null) {
      errores.archivo = errorArchivo;
    }
  }
  return errores;
}

/** Los valores del formulario, ya validados, como el contrato que se manda al backend. */
export function aNuevoContrato(valores: ValoresNuevoContrato): NuevoContrato {
  return {
    idUsuario: Number(valores.idUsuario),
    nombre: valores.nombre.trim(),
    archivo: valores.archivo as File,
  };
}

/** Con qué nombre se guarda en la computadora: "Convenio_Beca_Fundacion_Encode_2026.pdf". */
export function nombreDeDescarga(nombreDelContrato: string): string {
  return `${aNombreDeArchivo(nombreDelContrato) || 'Contrato'}.pdf`;
}
