/**
 * Manejo de texto que usa más de una pantalla.
 *
 * Estas dos funciones estaban copiadas en cinco archivos distintos. El
 * problema no era el largo —son tres líneas— sino que si alguien arregla un
 * caso en una copia, las otras cuatro siguen mal.
 */

/**
 * Saca los acentos y la eñe, conservando mayúsculas. "Título" → "Titulo".
 *
 * `NFD` separa cada letra acentuada de su tilde ("í" pasa a ser "i" + la
 * marca) y `\p{Diacritic}` descarta esas marcas.
 */
export function sinAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Deja un texto comparable: sin acentos, sin mayúsculas y sin espacios de más.
 *
 * Hace falta porque los nombres de los tipos de documento los tipea una
 * persona en la tabla `tipos_documentos`, y ahí una tilde de diferencia no
 * debería descontar un documento entregado. "Apto Físico" y "apto fisico "
 * tienen que ser el mismo documento.
 */
export function normalizarTexto(texto: string): string {
  return sinAcentos(texto).trim().toLowerCase();
}

/**
 * Las iniciales para el círculo del avatar. "Dolores Díaz" → "DD".
 *
 * Toma la primera letra del primer nombre y la del último apellido. Con una
 * sola palabra devuelve una sola letra, y con la cadena vacía devuelve vacío
 * en vez de romper.
 */
export function inicialesDe(nombreCompleto: string): string {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return '';
  }

  const primera = partes[0].charAt(0);
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';

  return (primera + ultima).toUpperCase();
}
