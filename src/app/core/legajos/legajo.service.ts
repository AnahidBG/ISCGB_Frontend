import { Observable } from 'rxjs';
import { DocumentoLegajo } from './modelos/documento-legajo';
import {
  DocumentoRequerido,
  NuevoDocumentoLegajo,
} from './modelos/documento-requerido';

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
 * Cubre las cuatro operaciones que expone `LegajosController`:
 *
 *   · `obtenerLegajoPropio`     — "¿cómo está MI legajo?" (Docente, Alumno)
 *   · `documentosRequeridos`    — "¿qué documentos me piden por mi rol?"
 *   · `subirDocumento`          — cargar un PDF
 *   · `auditar`                 — aprobar/rechazar (Secretario, Director)
 *
 * Falta una quinta que el backend NO tiene: listar los documentos pendientes
 * de revisión de TODO el instituto. Hoy solo se puede pedir de a un usuario
 * por vez, así que `listarParaRevision()` sigue simulado — está anotado en la
 * implementación y en docs/alcance-paneles-roles.md.
 */
export abstract class LegajoService {
  /** El legajo de la persona que tiene la sesión abierta. */
  abstract obtenerLegajoPropio(): Observable<DocumentoLegajo[]>;

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
   * Documentos de todo el instituto pendientes de revisión.
   *
   * ⚠️ SIGUE SIMULADO. No existe endpoint para esto — ver el comentario de
   * arriba. No usarlo para nada que dé a entender que son datos reales.
   */
  abstract listarParaRevision(): Observable<DocumentoLegajo[]>;
}
