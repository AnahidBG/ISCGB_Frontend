import { TipoExamen } from '../examenes/modelos/tipo-examen';
import { normalizarTexto } from '../comun/texto';

/** Cómo se muestra el tipo en el alta de una mesa: las mesas son los finales. */
export const NOMBRE_TIPO_MESA = 'Mesa de examen';

/**
 * Cómo puede llamarse en `tipo_examen` el tipo de una mesa, en orden de
 * preferencia. Hoy la base no tiene "Mesa de examen": se usa "Final", que el
 * seeder del backend agrega desde el 10/11/2026. Si el backend suma un tipo
 * propio para las mesas, gana ese sin tocar nada más.
 */
const NOMBRES_EN_LA_BASE: readonly string[] = [NOMBRE_TIPO_MESA, 'Final'];

/**
 * El tipo con que se registra una mesa, o `null` si la base no tiene ninguno.
 *
 * En "Mesas de examen" no se elige el tipo: una mesa siempre es un final. Por
 * eso de todos los que trae `tipos-examen` (Parcial, Coloquio…) queda uno solo,
 * con el id de la base y el nombre que se muestra, "Mesa de examen". La
 * comparación no distingue mayúsculas, tildes ni espacios de más, porque los
 * nombres los tipea una persona en la tabla.
 */
export function tipoDeLaMesa(tipos: readonly TipoExamen[]): TipoExamen | null {
  for (const nombre of NOMBRES_EN_LA_BASE) {
    const tipo = tipos.find((t) => normalizarTexto(t.nombre) === normalizarTexto(nombre));
    if (tipo !== undefined) {
      return { idTipoExamen: tipo.idTipoExamen, nombre: NOMBRE_TIPO_MESA };
    }
  }
  return null;
}
