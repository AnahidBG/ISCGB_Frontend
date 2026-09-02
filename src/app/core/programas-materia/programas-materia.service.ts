import { Observable } from 'rxjs';
import { ContextoDocente } from './modelos/contexto-docente';
import { ProgramaMateria } from './modelos/programa-materia';

/** Cuando el servidor no responde, o responde con un error no esperado. */
export const MENSAJE_ERROR_ENVIO_PROGRAMA =
  'No pudimos enviar el programa de materia. Intentá de nuevo en un momento.';

/** Cuando el programa se guardó pero el PDF no se pudo generar ni bajar. */
export const MENSAJE_ERROR_PDF_PROGRAMA =
  'El programa quedó guardado, pero no pudimos generar el PDF. Probá descargarlo de nuevo.';

/** Cuando no se pueden traer las materias a cargo del docente. */
export const MENSAJE_ERROR_CONTEXTO_DOCENTE =
  'No pudimos traer tus materias. Recargá la página o intentá de nuevo en un momento.';

/**
 * Contrato de envío del programa de materia.
 *
 * Misma idea que `AuthService`: una clase abstracta con dos implementaciones
 * intercambiables desde `app.config.ts`.
 *
 *   · `ProgramasMateriaMockService` — no toca la red. Para desarrollar la
 *     pantalla sin depender de que el backend esté levantado.
 *   · `ProgramasMateriaHttpService` — pega contra la API real.
 *
 * El componente pide `ProgramasMateriaService` y no le importa cuál le tocó.
 *
 * El backend expone esto en DOS pasos, y el orden importa: primero se guarda
 * el programa y recién con el `idPrograma` que devuelve se puede pedir el PDF.
 */
export abstract class ProgramasMateriaService {
  /**
   * Quién es el docente y qué materias dicta, a partir del `idUsuario` de la
   * sesión.
   *
   * Devuelve `null` cuando ese usuario NO está registrado como docente (el
   * backend responde 404). Es un caso legítimo, no un error de red: una
   * sesión de Alumno o de Secretaría no tiene fila en `docentes`.
   *
   * Falla con `Error(MENSAJE_ERROR_CONTEXTO_DOCENTE)` si el servidor no
   * contesta.
   */
  abstract obtenerContextoDocente(idUsuario: number): Observable<ContextoDocente | null>;

  /**
   * Envía el programa completo (datos generales + unidades de contenido) en
   * un solo `POST` y devuelve el **`idPrograma`** que asignó el backend.
   *
   * Ese ID no es un detalle administrativo: es lo único que permite pedir el
   * PDF después. Si se descarta, el usuario se queda sin forma de bajarlo.
   *
   * Falla con `Error(MENSAJE_ERROR_ENVIO_PROGRAMA)` si el servidor no
   * contesta o devuelve un error.
   */
  abstract enviarPrograma(programa: ProgramaMateria): Observable<number>;

  /**
   * Pide el PDF de un programa ya guardado.
   *
   * Devuelve el archivo crudo como `Blob` — el backend responde con
   * `application/pdf`, no con JSON. Quien lo consuma decide qué hacer con él
   * (descargarlo, previsualizarlo).
   *
   * Falla con `Error(MENSAJE_ERROR_PDF_PROGRAMA)`.
   */
  abstract descargarPdf(idPrograma: number): Observable<Blob>;
}
