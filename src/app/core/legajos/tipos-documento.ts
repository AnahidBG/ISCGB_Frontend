import { DocumentoLegajo } from './modelos/documento-legajo';
import { LegajoResumenUsuario } from './modelos/legajo-resumen';

/**
 * Cómo saco el nombre de un tipo de documento a partir de su id.
 *
 * El problema: `resumen-estado` manda `idTipoDoc` pero no el nombre, y no hay
 * endpoint que liste `tipos_documentos`. Mostrar "documento #3" no le sirve a
 * nadie que tiene que aprobar un título.
 *
 * Lo que hago: `pendientes` sí manda el nombre junto con el `idLegajo`, y
 * `resumen-estado` manda el `idLegajo` con su `idTipoDoc`. Cruzándolos saco
 * pares (idTipoDoc → nombre) que salen de la base, y como el id es el mismo
 * en todo el sistema me sirven también para los aprobados y rechazados. Lo
 * que no aparece en ningún pendiente cae al mapa hardcodeado de abajo.
 *
 * Se arregla de verdad agregando `NombreDocumento` a `DocumentoSubidoDto` en
 * el backend (un Include más, igual que en `ObtenerLegajosPendientes`). Ahí
 * este archivo se borra entero.
 */

/**
 * ⚠️ Frágil, es el último recurso. Copia el orden en que `datos-iniciales.sql`
 * inserta los tipos, asumiendo que la tabla estaba vacía. Si alguien insertó
 * algo antes, estos ids no corresponden y el nombre sale mal.
 */
const NOMBRES_SEGUN_SEED: Readonly<Record<number, string>> = {
  1: 'DNI Copia Actualizada',
  2: 'Título de Grado - Analítico',
  3: 'Certificado de Salud',
  4: 'Apto Físico',
  5: 'Certificado de Antecedentes Penales',
  6: 'Constancia de CUIL',
  7: 'Curso de Capacitación',
  8: 'Analítico Secundario',
  9: 'Partida de Nacimiento',
  10: 'Foto Carnet',
};

/** Nombres reales aprendidos del cruce. Vacío = todavía no se aprendió nada. */
export type MapaTiposDocumento = ReadonlyMap<number, string>;

/**
 * Cruza el resumen con los pendientes para sacar qué nombre va con cada
 * `idTipoDoc`. En `pendientes`, `id` es el idLegajo y `nombre` el del tipo.
 */
export function aprenderNombresDeTipos(
  resumen: readonly LegajoResumenUsuario[],
  pendientes: readonly DocumentoLegajo[],
): MapaTiposDocumento {
  // idLegajo → idTipoDoc, desde el resumen.
  const tipoPorLegajo = new Map<number, number>();
  for (const usuario of resumen) {
    for (const documento of usuario.documentos) {
      if (documento.idTipoDoc !== null) {
        tipoPorLegajo.set(documento.idLegajo, documento.idTipoDoc);
      }
    }
  }

  // idTipoDoc → nombre, cruzando por idLegajo con los pendientes.
  const nombrePorTipo = new Map<number, string>();
  for (const pendiente of pendientes) {
    const idTipoDoc = tipoPorLegajo.get(pendiente.id);
    if (idTipoDoc !== undefined && pendiente.nombre.trim() !== '') {
      nombrePorTipo.set(idTipoDoc, pendiente.nombre);
    }
  }

  return nombrePorTipo;
}

/** Prioridad: lo que salió de la base > el mapa hardcodeado > algo genérico. */
export function nombreTipoDocumento(
  idTipoDoc: number | null,
  aprendidos: MapaTiposDocumento,
): string {
  if (idTipoDoc === null) {
    return 'Documento sin tipo asignado';
  }

  return (
    aprendidos.get(idTipoDoc) ??
    NOMBRES_SEGUN_SEED[idTipoDoc] ??
    `Documento (tipo #${idTipoDoc})`
  );
}
