import { Observable } from 'rxjs';
import { DocumentoLegajo } from './modelos/documento-legajo';
import {
  DocumentoRequerido,
  NuevoDocumentoLegajo,
} from './modelos/documento-requerido';
import { LegajoResumenUsuario } from './modelos/legajo-resumen';
import { ResumenUsuarioLegajo } from './modelos/resumen-usuario-legajo';

/** Los dos únicos veredictos posibles. Ver CLAUDE.md, regla de negocio #3. */
export type VeredictoLegajo = 'Aprobado' | 'Rechazado';

export const MENSAJE_ERROR_LEGAJO =
  'No pudimos traer el legajo. Intentá de nuevo en un momento.';

export const MENSAJE_ERROR_SUBIDA =
  'No pudimos subir el documento. Revisá que sea un PDF e intentá de nuevo.';

export const MENSAJE_ERROR_AUDITORIA_LEGAJO =
  'No pudimos guardar la revisión. Intentá de nuevo en un momento.';

/**
 * Contrato de legajos: los documentos que cada persona tiene que presentar.
 *
 * Cubre las seis operaciones de `LegajosController`. Las dos últimas
 * (`listarParaRevision` y `obtenerResumenInstitucional`) son las que usa
 * Control de Legajos.
 */
export abstract class LegajoService {
  /** El legajo de la persona que tiene la sesión abierta. */
  abstract obtenerLegajoPropio(): Observable<DocumentoLegajo[]>;

  /** El legajo de un usuario concreto, para revisión por parte de Secretaría o Dirección. */
  abstract obtenerLegajoDeUsuario(idUsuario: number): Observable<DocumentoLegajo[]>;

  /**
   * Qué documentos le corresponden a un rol.
   *
   * Es lo que hace falta para calcular el progreso REAL del legajo
   * (aprobados / obligatorios), en vez del optimista que usan hoy los paneles
   * de Docente y Alumno (aprobados / cargados), que no cuenta lo que todavía
   * ni se subió.
   *
   * Devuelve `[]` si ese rol no tiene documentos configurados — el backend
   * responde 404 en ese caso y la implementación lo traduce, porque "todavía
   * nadie configuró qué le pedimos a este rol" no es un error de red.
   */
  abstract documentosRequeridos(idRol: number): Observable<DocumentoRequerido[]>;

  /** Sube un PDF al legajo de alguien. Queda en estado Pendiente. */
  abstract subirDocumento(documento: NuevoDocumentoLegajo): Observable<void>;

  /**
   * Aprueba o rechaza un documento del legajo.
   *
   * ⚠️ Igual que en justificativos: la regla de negocio #4 de CLAUDE.md pide
   * que rechazar dispare un email automático, y el backend todavía no lo
   * hace. Quien construya la pantalla que use esto tiene que decírselo a la
   * persona que revisa.
   */
  abstract auditar(
    idLegajo: number,
    veredicto: VeredictoLegajo,
    idUsuarioAuditor: number,
    comentario: string | null,
  ): Observable<void>;

  /**
   * Documentos de todo el instituto esperando revisión.
   * `GET /api/Legajos/pendientes`.
   *
   * Hasta el 01/09/2026 esta era además la única fuente que decía cómo se
   * llama cada tipo de documento: `tipos-documento.ts` cruzaba estos
   * pendientes con `resumen-estado` para adivinar los nombres, porque ese
   * otro endpoint manda `idTipoDoc` pero no el nombre. Ese cruce tenía un
   * efecto feo: al aprobar un documento salía de `pendientes`, se perdía el
   * nombre aprendido y la pantalla pasaba a mostrar el nombre adivinado de
   * una tabla hardcodeada — el documento "se renombraba solo" al aprobarlo.
   *
   * Ya no se usa para eso: la revisión pasó al perfil de cada persona, que
   * lee `GET /api/Legajos/usuario/{id}`, y ese sí devuelve el nombre real
   * del tipo (`LegajoDetalleDto.TipoDocumento`, con su JOIN) para cualquier
   * estado. `tipos-documento.ts` quedó sin uso y hay que borrarlo — no lo
   * reutilices: vuelve a traer el renombrado.
   */
  abstract listarParaRevision(): Observable<DocumentoLegajo[]>;

  /**
   * Legajos de todo el instituto agrupados por usuario, con el detalle
   * documento por documento. `GET /api/Legajos/resumen-estado`.
   *
   * ⚠️ Ya no la usa Control de Legajos (ver `obtenerResumenUsuarios()` abajo):
   * la vista principal de "Ver Legajos" pasó a listar personas, no
   * documentos, así que trae todo el legajo del instituto de entrada para
   * nada. Queda por si algo más la necesita — si nada la usa, se puede
   * borrar junto con `LegajoResumenUsuario`.
   */
  abstract obtenerResumenInstitucional(): Observable<LegajoResumenUsuario[]>;

  /**
   * Todas las personas del instituto con conteos por estado (aprobados/
   * pendientes/rechazados/otros), SIN la lista de documentos de cada una.
   * `GET /api/Legajos/resumen-usuarios`.
   *
   * Es lo que dibuja la vista principal de "Ver Legajos": una lista de
   * personas liviana, sin traer el legajo completo del instituto de entrada.
   * El detalle documento por documento se pide recién al abrir el perfil de
   * una persona, con `obtenerLegajoDeUsuario()`.
   */
  abstract obtenerResumenUsuarios(): Observable<ResumenUsuarioLegajo[]>;
}
