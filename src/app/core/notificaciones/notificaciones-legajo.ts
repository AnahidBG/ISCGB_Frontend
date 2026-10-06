import { DocumentoLegajo } from '../legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../legajos/modelos/documento-requerido';
import {
  calcularProgresoLegajo,
  obligatoriosSinCargar,
  requeridoDelDocumento,
  ultimaVersionPorTipo,
} from '../legajos/progreso-legajo';
import { consultaConTipo } from '../legajos/tipo-en-url';
import { NotificacionPanel } from './modelos/notificacion-panel';

/**
 * Los documentos rechazados de un legajo, como novedades de la campana.
 *
 * Es el caso más repetido del sistema — lo usa `novedadesDelLegajo`, que a su
 * vez alimenta la campana de Docente y Alumno vía `CampanaService` — y por
 * eso vive acá y no copiado en cada uno:
 * si mañana cambia cómo se redacta el aviso, cambia en un solo lugar (mismo
 * criterio que `enlacesPorSesion` con el menú).
 *
 * Solo cuenta lo RECHAZADO, no lo pendiente: un rechazo es algo que esta
 * persona tiene que resolver (volver a subir el documento), mientras que un
 * pendiente está esperando a Secretaría. Avisarle de algo sobre lo que no
 * puede hacer nada la entrena para ignorar la campana.
 */
export function notificacionesPorRechazos(
  documentos: readonly DocumentoLegajo[],
  opciones: { url?: string } = {},
): NotificacionPanel[] {
  return (
    documentos
      .filter((documento) => documento.estado === 'Rechazado')
      // Lo más nuevo primero: es lo que la persona todavía no vio.
      .sort((a, b) => b.fechaSubida.getTime() - a.fechaSubida.getTime())
      .map((documento) => ({
        titulo: `Rechazaron ${documento.nombre}`,
        // El motivo es lo único que dice qué hay que corregir. Cuando quien
        // auditó no escribió ninguno, se dice eso en vez de dejar la fila muda.
        detalle: documento.comentario ?? 'Sin motivo cargado: consultá en Secretaría.',
        url: opciones.url,
        tono: 'rechazado' as const,
      }))
  );
}

/** Todas las novedades del legajo propio y cuántas son, para la campana. */
export interface NovedadesLegajo {
  /** Cuántas hay en total — lo que enciende el número de la campana. */
  total: number;
  /** TODAS las novedades, en orden de urgencia: el recorte es de la presentación. */
  detalle: NotificacionPanel[];
}

/**
 * Las novedades del legajo PROPIO — Sprint 2, "Notificación de
 * documentación faltante (Sistema)" (SCRUM-7, subtarea frontend SCRUM-148).
 *
 * Es la parte del aviso que vive dentro del sistema: la campana del panel.
 * El backend incorporó el envío automático y la frecuencia configurable en
 * SCRUM-149 (PR #29); esta función solo arma los avisos visibles en el front.
 *
 * En orden de urgencia:
 *
 *   1. Rechazados (SCRUM-152): hay que corregir y volver a subir.
 *   2. Vencidos: documentos anuales aprobados cuya fecha ya pasó.
 *   3. Faltantes (SCRUM-150/154): obligatorios del rol que nunca se subieron.
 *      El texto sigue el mail que pide SCRUM-156: cargarlo desde Autogestión
 *      y entregarlo en papel en Secretaría.
 *   4. Legajo completo (SCRUM-153): todo lo obligatorio está aprobado.
 *
 * Trabaja sobre la versión VIGENTE de cada documento: un rechazo que la
 * persona ya corrigió (volvió a subir el documento) no se avisa más.
 */
export function novedadesDelLegajo(
  documentos: readonly DocumentoLegajo[],
  requeridos: readonly DocumentoRequerido[],
  opciones: { url?: string; ahora?: number } = {},
): NovedadesLegajo {
  const ahora = opciones.ahora ?? Date.now();
  const vigentes = ultimaVersionPorTipo(documentos);

  const rechazados = notificacionesPorRechazos(vigentes, { url: opciones.url });

  const vencidos: NotificacionPanel[] = vigentes
    .filter(
      (documento) =>
        documento.estado === 'Aprobado' &&
        documento.fechaVencimiento !== null &&
        documento.fechaVencimiento.getTime() < ahora,
    )
    .map((documento) => {
      // El legajo no trae el id del tipo: se busca por nombre entre los del
      // rol. Si ya no está entre ellos, el formulario abre sin tipo elegido.
      const tipo = requeridoDelDocumento(documento, requeridos);
      return {
        titulo: `Se venció ${documento.nombre}`,
        detalle: 'Es un documento anual: volvé a presentarlo.',
        url: '/legajo/subir-documento',
        consulta: tipo === null ? undefined : consultaConTipo(tipo.idTipoDoc),
        tono: 'pendiente' as const,
      };
    });

  const faltantes: NotificacionPanel[] = obligatoriosSinCargar(documentos, requeridos).map(
    (requerido) => ({
      titulo: `Falta entregar ${requerido.nombreDocumento}`,
      detalle: 'Cargalo desde Subir Documento y entregalo en papel en Secretaría.',
      url: '/legajo/subir-documento',
      // Abre el formulario con este tipo ya elegido.
      consulta: consultaConTipo(requerido.idTipoDoc),
      tono: 'pendiente' as const,
    }),
  );

  const progreso = calcularProgresoLegajo(documentos, requeridos);
  const completo =
    !progreso.estimado &&
    progreso.porcentaje === 100 &&
    rechazados.length === 0 &&
    vencidos.length === 0;

  const todas: NotificacionPanel[] = [
    ...rechazados,
    ...vencidos,
    ...faltantes,
    ...(completo
      ? [
          {
            titulo: '¡Tu legajo está completo!',
            detalle: 'Todos los documentos obligatorios están aprobados.',
            tono: 'aprobado' as const,
          },
        ]
      : []),
  ];

  return { total: todas.length, detalle: todas };
}
