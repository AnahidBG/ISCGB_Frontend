import { DocumentoResumenLegajo } from './modelos/legajo-resumen';

/** Cuántos documentos hay en cada estado del semáforo. */
export interface ConteoPorEstado {
  aprobados: number;
  pendientes: number;
  rechazados: number;
  /** Estado que no es ninguno de los tres (incluye `null`): la columna es texto libre. */
  otros: number;
  total: number;
}

/**
 * De cada tipo de documento, solo la versión más nueva.
 *
 * `POST /api/Legajos` crea una fila NUEVA cada vez que alguien resube un
 * documento: nunca pisa la anterior. Un DNI rechazado y vuelto a subir deja
 * dos filas — una "Rechazado" y otra "Pendiente". Contar las dos inflaba los
 * números de Control de Legajos y del panel del Director: la persona
 * figuraba con un rechazo que ya había corregido.
 *
 * `resumen-estado` trae `idTipoDoc` e `idLegajo` pero no la fecha, así que
 * "la más nueva" es la de `idLegajo` más alto: es una columna IDENTITY, crece
 * con cada alta. Los documentos sin `idTipoDoc` no se pueden agrupar y se
 * cuentan todos, cada uno por su lado.
 */
export function ultimasVersionesPorTipo(
  documentos: readonly DocumentoResumenLegajo[],
): DocumentoResumenLegajo[] {
  const porTipo = new Map<number, DocumentoResumenLegajo>();
  const sinTipo: DocumentoResumenLegajo[] = [];

  for (const documento of documentos) {
    if (documento.idTipoDoc === null) {
      sinTipo.push(documento);
      continue;
    }
    const actual = porTipo.get(documento.idTipoDoc);
    if (actual === undefined || documento.idLegajo > actual.idLegajo) {
      porTipo.set(documento.idTipoDoc, documento);
    }
  }

  return [...porTipo.values(), ...sinTipo];
}

/** Cuenta por estado SOLO la versión vigente de cada documento. */
export function contarPorEstado(documentos: readonly DocumentoResumenLegajo[]): ConteoPorEstado {
  const vigentes = ultimasVersionesPorTipo(documentos);
  const aprobados = vigentes.filter((d) => d.estado === 'Aprobado').length;
  const pendientes = vigentes.filter((d) => d.estado === 'Pendiente').length;
  const rechazados = vigentes.filter((d) => d.estado === 'Rechazado').length;

  return {
    aprobados,
    pendientes,
    rechazados,
    otros: vigentes.length - aprobados - pendientes - rechazados,
    total: vigentes.length,
  };
}

/**
 * Un solo color para todo el legajo de una persona, para la columna "Legajo"
 * del panel del Director.
 *
 *   · Algo rechazado  → Rechazado (hay algo que la persona tiene que corregir)
 *   · Algo pendiente  → Pendiente (Secretaría tiene algo por revisar)
 *   · Todo aprobado   → Aprobado
 *   · Nada presentado → `null` (la insignia lo muestra como "sin datos")
 *
 * ⚠️ "Aprobado" acá quiere decir "todo lo que PRESENTÓ está aprobado", no
 * "tiene el legajo completo": `resumen-estado` no dice qué documentos le
 * corresponden a cada rol. El detalle con los faltantes está en el legajo
 * de cada persona.
 */
export function estadoGeneralDelLegajo(
  documentos: readonly DocumentoResumenLegajo[],
): 'Aprobado' | 'Pendiente' | 'Rechazado' | null {
  const conteo = contarPorEstado(documentos);
  if (conteo.total === 0) {
    return null;
  }
  if (conteo.rechazados > 0) {
    return 'Rechazado';
  }
  if (conteo.pendientes > 0 || conteo.otros > 0) {
    return 'Pendiente';
  }
  return 'Aprobado';
}
