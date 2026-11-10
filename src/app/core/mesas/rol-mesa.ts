/**
 * El lugar de un docente en el tribunal de una mesa de examen: la columna `rol`
 * de `mesa_examen` (`RolesMesa` en el backend).
 */
export type RolMesa = 'Presidente' | 'Vocal 1' | 'Vocal 2';

const ROLES_MESA: readonly RolMesa[] = ['Presidente', 'Vocal 1', 'Vocal 2'];

/** "Vocal 1", " vocal1 " y "VOCAL 1" son lo mismo: así compara también el backend. */
function sinEspaciosNiMayusculas(texto: string): string {
  return texto.replace(/\s+/g, '').toLowerCase();
}

/**
 * Adapter: el `rol` que manda el backend, con su escritura oficial, o `null` si
 * no viene o no es uno de los tres (un backend anterior al 10/11/2026 no lo manda).
 */
export function aRolMesa(valor: unknown): RolMesa | null {
  if (typeof valor !== 'string') {
    return null;
  }
  const buscado = sinEspaciosNiMayusculas(valor);
  return ROLES_MESA.find((rol) => sinEspaciosNiMayusculas(rol) === buscado) ?? null;
}

/** "presidente", "vocal 1": para usar dentro de una oración. */
export function rolEnOracion(rol: RolMesa): string {
  return rol.toLowerCase();
}
