import { ROLES, Rol, rolPorId } from '../auth/modelos/rol';
import { Sesion } from '../auth/modelos/sesion';
import { idRolDocumental } from './rol-documental';

/**
 * Qué roles marcan ellos mismos, al subir un documento, que también lo
 * entregaron en papel en Secretaría (`SubirLegajoDto.PresentadoFisico`).
 *
 * Historia de la casilla "También entregué este documento en Secretaría":
 *   · 02/09/2026: se sacó para todos, a pedido de Dirección, y quedó solo el
 *     recordatorio rojo. Nadie podía verificar desde el sistema si el papel
 *     estaba de verdad.
 *   · 04/10/2026: vuelve, pero SOLO para Docentes. El alumno sigue viendo
 *     únicamente el recordatorio.
 *
 * Tabla por clave con caso por defecto `false`: un rol nuevo no muestra la
 * casilla hasta que alguien lo decida acá.
 */
const DECLARA_ENTREGA_EN_PAPEL: Partial<Record<Rol, boolean>> = {
  [ROLES.docente]: true,
};

/**
 * ¿Esta persona ve la casilla de entrega en papel al subir un documento?
 *
 * Se decide por el rol DOCUMENTAL (`idRolDocumental`), el mismo que elige qué
 * documentos se le piden: un Director que además da clase presenta como
 * Docente, así que también la ve. Sin sesión o sin los ids de los roles
 * (mock, sesión vieja) no se muestra.
 */
export function declaraEntregaEnPapel(sesion: Sesion | null): boolean {
  const idRol = idRolDocumental(sesion);
  const rol = idRol === null ? null : rolPorId(idRol);
  return rol !== null && (DECLARA_ENTREGA_EN_PAPEL[rol] ?? false);
}
