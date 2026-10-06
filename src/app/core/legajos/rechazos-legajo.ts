import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';
import { requeridoDelDocumento, ultimaVersionPorTipo } from './progreso-legajo';

/** Lo que se muestra cuando quien revisó no escribió por qué rechazó. */
export const MOTIVO_SIN_CARGAR = 'Sin motivo cargado: consultá en Secretaría.';

/** Un documento rechazado que la persona todavía tiene que corregir. */
export interface RechazoVigente {
  documento: DocumentoLegajo;

  /**
   * Por qué lo rechazaron: es lo único que dice qué hay que corregir. Si
   * quien revisó no cargó ninguno, `MOTIVO_SIN_CARGAR`.
   */
  motivo: string;

  /**
   * El tipo del documento, para abrir "Subir Documento" con él ya elegido
   * (`consultaConTipo`). `null` si ya no está entre los que el instituto le
   * pide a su rol.
   */
  tipo: DocumentoRequerido | null;
}

/**
 * Los documentos rechazados que la persona todavía tiene que corregir
 * (SCRUM-152), lo más nuevo primero.
 *
 * Es la única definición de "tiene un rechazo": la usan el aviso de la
 * campana (`novedadesDelLegajo`) y la tarjeta `DocumentosRechazados` de los
 * paneles, así nunca muestran listas distintas.
 *
 * Mira la versión VIGENTE de cada documento: el backend guarda una fila nueva
 * por cada resubida, así que un rechazo que ya se corrigió (se volvió a subir
 * el documento) queda en la base pero deja de aparecer acá.
 */
export function rechazosVigentes(
  documentos: readonly DocumentoLegajo[],
  requeridos: readonly DocumentoRequerido[],
): RechazoVigente[] {
  return ultimaVersionPorTipo(documentos)
    .filter((documento) => documento.estado === 'Rechazado')
    .sort((a, b) => b.fechaSubida.getTime() - a.fechaSubida.getTime())
    .map((documento) => ({
      documento,
      motivo: documento.comentario?.trim() || MOTIVO_SIN_CARGAR,
      tipo: requeridoDelDocumento(documento, requeridos),
    }));
}
