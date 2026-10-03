import { JustificativoPendiente } from '../justificativos/modelos/justificativo-pendiente';
import { ResumenUsuarioLegajo } from '../legajos/modelos/resumen-usuario-legajo';
import { NotificacionPanel } from './modelos/notificacion-panel';
import { NovedadesLegajo } from './notificaciones-legajo';

/**
 * Lo que esperaba revisión de Secretaría o Dirección, como novedades de la
 * campana.
 *
 * Antes cada pantalla armaba su versión y las tres contaban cosas distintas:
 * el panel del Secretario solo los justificativos, el del Director los
 * legajos con estado general "Pendiente" (una fila por persona, sin enlace a
 * su legajo ni cuántos documentos) y Control de Legajos los documentos
 * pendientes por persona. Una campana que dice tres cosas según la pantalla
 * en la que estás parada no sirve, así que esta es la unión de las tres, con
 * la redacción más completa de cada una:
 *
 *   1. Justificativos de inasistencia esperando revisión. Sin `url`: se
 *      revisan en el panel del Secretario y el Director no tiene esa pantalla,
 *      así que un enlace rebotaría.
 *   2. Personas con documentos de legajo esperando revisión, de mayor a menor.
 *      Cada fila abre su perfil, que es donde se aprueba o se rechaza.
 *
 * El `total` suma justificativos + documentos (no filas): es "cuántas cosas
 * esperan revisión". El detalle trae TODAS las filas, sin recortar: el
 * desplegable de la campana muestra las primeras y su panel lateral todas
 * (recortar es cosa de la presentación).
 *
 * Es una función pura: no sabe de dónde salen los datos.
 */
export function novedadesPendientesDelInstituto(
  justificativos: readonly JustificativoPendiente[],
  personas: readonly ResumenUsuarioLegajo[],
): NovedadesLegajo {
  const filasDeJustificativos: NotificacionPanel[] = justificativos.map((justificativo) => ({
    titulo: `${justificativo.nombreDocente} pidió justificar una inasistencia`,
    detalle: justificativo.tipoInasistencia,
    url: undefined,
    tono: 'pendiente' as const,
  }));

  const conPendientes = personas.filter((persona) => persona.pendientes > 0);

  const filasDeLegajos: NotificacionPanel[] = [...conPendientes]
    .sort((a, b) => b.pendientes - a.pendientes)
    .map((persona) => ({
      titulo: persona.nombreCompleto,
      detalle: `${persona.pendientes} ${
        persona.pendientes === 1 ? 'documento espera' : 'documentos esperan'
      } revisión`,
      url: `/legajo/usuario/${persona.idUsuario}`,
      tono: 'pendiente' as const,
    }));

  const documentosPendientes = conPendientes.reduce(
    (suma, persona) => suma + persona.pendientes,
    0,
  );

  return {
    total: justificativos.length + documentosPendientes,
    detalle: [...filasDeJustificativos, ...filasDeLegajos],
  };
}
