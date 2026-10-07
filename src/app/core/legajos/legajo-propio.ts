import { Observable, catchError, forkJoin, map, of, startWith } from 'rxjs';
import { LegajoService, MENSAJE_ERROR_LEGAJO } from './legajo.service';
import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';

/**
 * El legajo propio y lo que el instituto le pide al rol, con la fase en la que
 * está el pedido (SCRUM-150).
 *
 * Es una unión y no tres signals sueltos (`cargando`, `error`, `datos`) para
 * que no exista un estado imposible: no se puede estar "listo" sin documentos
 * ni "en error" sin mensaje. La pantalla pregunta por `fase` y TypeScript le
 * deja leer solo lo que esa fase tiene.
 */
export type LegajoPropio =
  | { fase: 'cargando' }
  | { fase: 'error'; mensaje: string }
  | { fase: 'listo'; documentos: DocumentoLegajo[]; requeridos: DocumentoRequerido[] };

export type FaseLegajo = LegajoPropio['fase'];

/** El valor inicial de la pantalla, antes de que responda el servidor. */
export const LEGAJO_CARGANDO: LegajoPropio = { fase: 'cargando' };

/**
 * Pide el legajo propio y los documentos que le corresponden al rol.
 *
 * Los dos pedidos se resuelven JUNTOS: con los documentos solos no se sabe qué
 * falta, y con los requeridos solos todo lo obligatorio parecería sin cargar.
 * Por eso tampoco se tolera que falle uno: la pantalla diría "no te falta
 * nada" sin saberlo. (La campana sí lo tolera, porque igual puede avisar los
 * rechazos: ver `fuenteLegajoPropio` en `campana.service.ts`.)
 *
 * Sin id de rol (sesión del mock, o guardada de antes de que existiera
 * `rolesConId`) no se piden los requeridos, y `calcularProgresoLegajo` cae
 * solo al cálculo estimado.
 *
 * Nunca falla: un error llega como una fase más. Así quien lo lee con
 * `toSignal` no recibe una excepción al dibujar.
 */
export function cargarLegajoPropio(
  legajos: LegajoService,
  idRol: number | null,
): Observable<LegajoPropio> {
  const requeridos$ =
    idRol === null ? of<DocumentoRequerido[]>([]) : legajos.documentosRequeridos(idRol);

  return forkJoin({ documentos: legajos.obtenerLegajoPropio(), requeridos: requeridos$ }).pipe(
    map(({ documentos, requeridos }): LegajoPropio => ({ fase: 'listo', documentos, requeridos })),
    catchError((fallo: unknown) =>
      of<LegajoPropio>({
        fase: 'error',
        mensaje: fallo instanceof Error && fallo.message !== '' ? fallo.message : MENSAJE_ERROR_LEGAJO,
      }),
    ),
    startWith(LEGAJO_CARGANDO),
  );
}

/** Los documentos del legajo. Vacío mientras carga o si falló. */
export function documentosDe(legajo: LegajoPropio): DocumentoLegajo[] {
  return legajo.fase === 'listo' ? legajo.documentos : [];
}

/** Lo que el instituto le pide al rol. Vacío mientras carga o si falló. */
export function requeridosDe(legajo: LegajoPropio): DocumentoRequerido[] {
  return legajo.fase === 'listo' ? legajo.requeridos : [];
}

/** El mensaje para mostrar si el pedido falló; si no, `null`. */
export function errorDe(legajo: LegajoPropio): string | null {
  return legajo.fase === 'error' ? legajo.mensaje : null;
}
