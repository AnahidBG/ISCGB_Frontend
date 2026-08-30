import { sinAcentos } from './texto';

/** Tope de tamaño para cualquier archivo que se suba al sistema. */
export const TAMANO_MAXIMO_ARCHIVO_BYTES = 10 * 1024 * 1024;

export const MENSAJE_NO_ES_PDF =
  'El sistema solo acepta archivos PDF. Convertí el documento y volvé a intentar.';

export const MENSAJE_ARCHIVO_MUY_GRANDE =
  'El archivo supera los 10 MB. Probá comprimirlo o escanearlo con menos calidad.';

/**
 * Revisa que el archivo sea un PDF y que entre en el tope.
 *
 * Devuelve el mensaje de error, o `null` si está bien. Devuelve el texto y no
 * un booleano para que quien lo use pueda mostrárselo a la persona sin
 * inventar su propia redacción — así el mismo problema se explica igual en
 * todas las pantallas.
 *
 * ⚠️ Esto NO es seguridad: mira el nombre y el tipo declarado, y los dos los
 * controla quien sube el archivo. Sirve para atajar el error honesto —
 * alguien que eligió el archivo equivocado. La validación real es por
 * contenido (los primeros bytes de un PDF son `%PDF-`) y va del lado del
 * servidor. Es la regla de negocio #1 y el backend todavía no la hace.
 */
export function validarArchivoPdf(archivo: File): string | null {
  // Se acepta `type` vacío porque algunos navegadores lo mandan así para PDFs
  // legítimos. Si el servidor después lo rechaza, su error ya lo explica.
  const esPdf =
    archivo.name.toLowerCase().endsWith('.pdf') &&
    (archivo.type === 'application/pdf' || archivo.type === '');

  if (!esPdf) {
    return MENSAJE_NO_ES_PDF;
  }

  if (archivo.size > TAMANO_MAXIMO_ARCHIVO_BYTES) {
    return MENSAJE_ARCHIVO_MUY_GRANDE;
  }

  return null;
}

/** El tamaño en algo legible, para mostrarlo al lado del nombre. */
export function tamanoLegible(archivo: File): string {
  const mb = archivo.size / (1024 * 1024);
  return mb < 1 ? `${Math.round(archivo.size / 1024)} KB` : `${mb.toFixed(1)} MB`;
}

/**
 * Convierte un texto en algo usable como nombre de archivo: sin acentos, sin
 * caracteres raros y con guiones bajos en vez de espacios.
 *
 * Hace falta porque el texto termina siendo un nombre en disco, y ahí una
 * barra o dos puntos rompen la ruta.
 */
export function aNombreDeArchivo(texto: string): string {
  return sinAcentos(texto.trim())
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, '_');
}
