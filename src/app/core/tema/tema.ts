/**
 * El tema visual del sistema: claro u oscuro.
 *
 * Lógica pura, sin Angular ni DOM, para poder probarla sola. Quien la usa es
 * `TemaService`; el selector de la interfaz es `<app-selector-tema>`.
 *
 * Hay tres PREFERENCIAS pero solo dos TEMAS. La preferencia es lo que la
 * persona eligió (`claro`, `oscuro` o `sistema`, que sigue al dispositivo) y
 * el tema es lo que de verdad se pinta (`claro` u `oscuro`). Se distinguen
 * porque "automático" no es un tercer aspecto: es una forma de decidir cuál
 * de los dos toca.
 *
 * El script de `index.html` repite estas reglas (la misma clave, el mismo
 * atributo, la misma decisión) para pintar el tema correcto ANTES de que
 * Angular arranque. Si cambia algo acá, hay que cambiarlo ahí también.
 */

/** Lo que la persona eligió. `sistema` acompaña la configuración del dispositivo. */
export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema';

/** Lo que efectivamente se dibuja. */
export type TemaAplicado = 'claro' | 'oscuro';

/** Las preferencias válidas, en el orden en que las muestra el selector. */
export const PREFERENCIAS_TEMA: readonly PreferenciaTema[] = ['claro', 'oscuro', 'sistema'];

/** Con qué preferencia arranca quien nunca eligió: la del dispositivo. */
export const PREFERENCIA_TEMA_INICIAL: PreferenciaTema = 'sistema';

/** Dónde se guarda la preferencia. Mismo estilo de clave que `iscgb.panel.colapsado`. */
export const CLAVE_PREFERENCIA_TEMA = 'iscgb.tema';

/** Atributo de `<html>` que activa los colores del tema oscuro en `styles.scss`. */
export const ATRIBUTO_TEMA = 'data-tema';

/** La consulta de CSS con la que el dispositivo avisa que prefiere el modo oscuro. */
export const CONSULTA_SISTEMA_OSCURO = '(prefers-color-scheme: dark)';

/** ¿Es una preferencia que el sistema conoce? Sirve para descartar lo que haya en el almacenamiento. */
export function esPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return PREFERENCIAS_TEMA.some((preferencia) => preferencia === valor);
}

/**
 * La preferencia a partir de lo que había guardado.
 *
 * Cualquier cosa que no sea una de las tres válidas (nada guardado, un valor
 * viejo, algo editado a mano) se trata como si no hubiera elegido nunca.
 */
export function leerPreferenciaTema(guardado: string | null | undefined): PreferenciaTema {
  return esPreferenciaTema(guardado) ? guardado : PREFERENCIA_TEMA_INICIAL;
}

/** El tema que corresponde pintar para una preferencia y un dispositivo dados. */
export function resolverTema(preferencia: PreferenciaTema, sistemaOscuro: boolean): TemaAplicado {
  if (preferencia === 'sistema') {
    return sistemaOscuro ? 'oscuro' : 'claro';
  }
  return preferencia;
}

/** El otro tema. Lo usa el botón de un solo toque, que alterna entre los dos. */
export function temaOpuesto(tema: TemaAplicado): TemaAplicado {
  return tema === 'oscuro' ? 'claro' : 'oscuro';
}
