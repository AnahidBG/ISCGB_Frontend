import { normalizarTexto } from '../comun/texto';
import { DocumentoLegajo } from './modelos/documento-legajo';
import { DocumentoRequerido } from './modelos/documento-requerido';

/**
 * El progreso del legajo de una persona, con el detalle de cómo se calculó.
 *
 * Devuelve los tres números y no solo el porcentaje a propósito: la pantalla
 * puede decir "3 de 8 documentos obligatorios" en vez de un "37%" pelado, que
 * no le dice a nadie cuánto le falta.
 */
export interface ProgresoLegajo {
  /** 0 a 100, redondeado. */
  porcentaje: number;
  /** Cuántos documentos obligatorios distintos ya están aprobados. */
  aprobados: number;
  /** Contra cuántos se está midiendo. */
  total: number;
  /**
   * `true` cuando el denominador NO son los documentos obligatorios del rol.
   *
   * Pasa cuando no sabemos qué le pide el instituto a esta persona: la sesión
   * no trae el id del rol (viene del mock, o quedó guardada de antes de que
   * existiera `rolesConId`), o la tabla `roles_tipos_documentos` no tiene
   * nada cargado para ese rol. En ese caso se cae al cálculo viejo
   * —aprobados sobre lo que ya subió— que da un número OPTIMISTA, porque no
   * cuenta lo que todavía ni presentó.
   *
   * La pantalla tiene que avisarlo cuando es `true`. Mostrar "100%" sin
   * aclarar que el denominador está incompleto es peor que no mostrar nada:
   * alguien se va tranquilo con el legajo a medio entregar.
   */
  estimado: boolean;
}

/**
 * Calcula el progreso de entrega del legajo — la barra del "Módulo de Salida"
 * (ISCGB-PROJECT.md).
 *
 * La fórmula del MVP es:
 *
 *     progreso = documentos aprobados / documentos OBLIGATORIOS del rol
 *
 * El denominador sale de `roles_tipos_documentos` vía
 * `GET /api/Legajos/requeridos-por-rol/{idRol}`, y cuenta solo los que tienen
 * `obligatorio: true` — los opcionales se pueden presentar, pero no hacen
 * falta para tener el legajo completo, así que no deberían empujar el
 * porcentaje para abajo.
 *
 * Es una función PURA y vive fuera de los componentes por dos razones: la
 * usan dos paneles (Docente y Alumno) y antes estaba copiada en los dos, y
 * así se puede probar sola, sin montar un componente ni simular HTTP.
 *
 * ── Dos limitaciones conocidas ────────────────────────────────────────────
 *
 * 1. **El cruce es por NOMBRE, no por id.** `GET /api/Legajos/usuario/{id}`
 *    devuelve `tipoDocumento` como texto y no expone `idTipoDoc`, así que no
 *    hay forma de cruzarlo por clave con la lista de requeridos. Se compara
 *    el nombre normalizado (sin mayúsculas, sin acentos, sin espacios de
 *    más). Si el backend agrega `idTipoDoc` a esa respuesta, hay que cambiar
 *    esto por una comparación de ids — es más barato y no se rompe si alguien
 *    corrige una tilde en `tipos_documentos`.
 *
 * 2. **No mira vencimientos.** Un documento `anual` aprobado el año pasado
 *    hoy cuenta como aprobado igual. Para contemplarlo hay que comparar
 *    `fechaVencimiento` contra hoy, y eso es una regla de negocio que todavía
 *    no está definida (¿vencido cuenta como pendiente, o como rechazado?).
 */
export function calcularProgresoLegajo(
  documentos: readonly DocumentoLegajo[],
  requeridos: readonly DocumentoRequerido[],
): ProgresoLegajo {
  const obligatorios = requeridos.filter((requerido) => requerido.obligatorio);

  // Se deduplica por tipo: subir dos veces el apto físico y que te aprueben
  // los dos no es tener dos documentos hechos, es tener uno.
  const nombresAprobados = new Set(
    documentos
      .filter((documento) => documento.estado === 'Aprobado')
      .map((documento) => normalizarTexto(documento.nombre)),
  );

  // Sin lista de obligatorios no hay denominador real. Ver `estimado`.
  if (obligatorios.length === 0) {
    const total = documentos.length;
    return {
      porcentaje: total === 0 ? 0 : porcentaje(nombresAprobados.size, total),
      aprobados: nombresAprobados.size,
      total,
      estimado: true,
    };
  }

  const cumplidos = obligatorios.filter((requerido) =>
    nombresAprobados.has(normalizarTexto(requerido.nombreDocumento)),
  ).length;

  return {
    porcentaje: porcentaje(cumplidos, obligatorios.length),
    aprobados: cumplidos,
    total: obligatorios.length,
    estimado: false,
  };
}

/**
 * Los documentos que el instituto le pide y que la persona todavía no subió.
 *
 * Sirve para el "Sin cargar" del panel: son los que no aparecen en el legajo
 * con ningún estado, ni siquiera pendiente o rechazado. Cruza por nombre
 * normalizado, igual que `calcularProgresoLegajo`, porque el legajo devuelve
 * el nombre del tipo y no su id.
 */
export function documentosSinCargar(
  documentos: readonly DocumentoLegajo[],
  requeridos: readonly DocumentoRequerido[],
): DocumentoRequerido[] {
  const cargados = new Set(documentos.map((documento) => normalizarTexto(documento.nombre)));

  return requeridos.filter(
    (requerido) => !cargados.has(normalizarTexto(requerido.nombreDocumento)),
  );
}

/**
 * Redondea y corta en 100.
 *
 * El tope importa en el camino estimado: ahí numerador y denominador salen de
 * conteos distintos (tipos únicos vs. filas cargadas), así que un legajo con
 * el mismo documento subido dos veces podría dar más de 100 y romper el ancho
 * de la barra.
 */
function porcentaje(parte: number, total: number): number {
  return Math.min(100, Math.round((parte / total) * 100));
}

