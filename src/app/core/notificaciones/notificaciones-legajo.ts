import { DocumentoLegajo } from '../legajos/modelos/documento-legajo';
import { DocumentoRequerido } from '../legajos/modelos/documento-requerido';
import {
  estaVencido,
  legajoEstaCompleto,
  obligatoriosSinCargar,
  requeridoDelDocumento,
  ultimaVersionPorTipo,
} from '../legajos/progreso-legajo';
import { RechazoVigente, rechazosVigentes } from '../legajos/rechazos-legajo';
import { consultaConTipo } from '../legajos/tipo-en-url';
import { NotificacionPanel } from './modelos/notificacion-panel';

/** Donde se sube (o se vuelve a subir) un documento del legajo propio. */
const URL_SUBIR_DOCUMENTO = '/legajo/subir-documento';

/**
 * Los rechazos vigentes de un legajo, como novedades de la campana.
 *
 * Es el caso más repetido del sistema — lo usa `novedadesDelLegajo`, que a su
 * vez alimenta la campana de Docente y Alumno vía `CampanaService` — y por
 * eso vive acá y no copiado en cada uno:
 * si mañana cambia cómo se redacta el aviso, cambia en un solo lugar (mismo
 * criterio que `enlacesPorSesion` con el menú).
 *
 * Recibe los rechazos ya resueltos por `rechazosVigentes`, que es quien
 * define qué cuenta como rechazo y en qué orden. Solo cuenta lo RECHAZADO, no
 * lo pendiente: un rechazo es algo que esta persona tiene que resolver
 * (volver a subir el documento), mientras que un pendiente está esperando a
 * Secretaría. Avisarle de algo sobre lo que no puede hacer nada la entrena
 * para ignorar la campana.
 *
 * Cada aviso es el acceso directo para corregirlo (SCRUM-152): abre "Subir
 * Documento" con el tipo ya elegido. Si no se sabe el tipo, lleva a
 * `opciones.url`, que es donde se ve el rechazo.
 */
export function notificacionesPorRechazos(
  rechazos: readonly RechazoVigente[],
  opciones: { url?: string } = {},
): NotificacionPanel[] {
  return rechazos.map(({ documento, motivo, tipo }) => ({
    titulo: `Rechazaron ${documento.nombre}`,
    // El motivo es lo único que dice qué hay que corregir.
    detalle: motivo,
    url: tipo === null ? opciones.url : URL_SUBIR_DOCUMENTO,
    consulta: tipo === null ? undefined : consultaConTipo(tipo.idTipoDoc),
    tono: 'rechazado' as const,
  }));
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
 *   1. Rechazados (SCRUM-152): hay que corregir y volver a subir. Salen de
 *      `rechazosVigentes`, igual que la tarjeta del panel.
 *   2. Vencidos: documentos anuales aprobados cuya fecha ya pasó.
 *   3. Faltantes (SCRUM-150/154): obligatorios del rol que nunca se subieron.
 *      El texto sigue el mail que pide SCRUM-156: cargarlo desde Autogestión
 *      y entregarlo en papel en Secretaría.
 *   4. Legajo completo (SCRUM-153): todo lo obligatorio está aprobado. La
 *      condición vive en `legajoEstaCompleto`, la misma del cartel del panel.
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

  const rechazados = notificacionesPorRechazos(rechazosVigentes(documentos, requeridos), {
    url: opciones.url,
  });

  const vencidos: NotificacionPanel[] = vigentes
    .filter((documento) => estaVencido(documento, ahora))
    .map((documento) => {
      // El legajo no trae el id del tipo: se busca por nombre entre los del
      // rol. Si ya no está entre ellos, el formulario abre sin tipo elegido.
      const tipo = requeridoDelDocumento(documento, requeridos);
      return {
        titulo: `Se venció ${documento.nombre}`,
        detalle: 'Es un documento anual: volvé a presentarlo.',
        url: URL_SUBIR_DOCUMENTO,
        consulta: tipo === null ? undefined : consultaConTipo(tipo.idTipoDoc),
        tono: 'pendiente' as const,
      };
    });

  const faltantes: NotificacionPanel[] = obligatoriosSinCargar(documentos, requeridos).map(
    (requerido) => ({
      titulo: `Falta entregar ${requerido.nombreDocumento}`,
      detalle: 'Cargalo desde Subir Documento y entregalo en papel en Secretaría.',
      url: URL_SUBIR_DOCUMENTO,
      // Abre el formulario con este tipo ya elegido.
      consulta: consultaConTipo(requerido.idTipoDoc),
      tono: 'pendiente' as const,
    }),
  );

  const completo = legajoEstaCompleto(documentos, requeridos, ahora);

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
