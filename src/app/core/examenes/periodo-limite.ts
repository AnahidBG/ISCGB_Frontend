/**
 * El período en el que cuenta el límite de parciales. Hoy es el día.
 *
 * La regla la aplica el backend: cuenta los parciales POR DÍA, con un solo límite
 * para todo el instituto. En Jira figura "por semana" y todavía no está definido.
 * Esta constante solo cambia la REDACCIÓN de los textos que nombran el período
 * ("2 parciales por día"): no cambia cómo se cuenta ni cómo se pinta cada día.
 * Cuando se defina, es esta línea; si resultara ser semanal de verdad, el estado
 * de cada celda también tendría que replantearse.
 */
export const PERIODO_DEL_LIMITE = 'día';
