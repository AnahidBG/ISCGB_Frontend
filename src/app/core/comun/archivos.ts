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

/** Tope de la foto de perfil: alcanza de sobra para un avatar. */
export const TAMANO_MAXIMO_FOTO_BYTES = 2 * 1024 * 1024;

export const MENSAJE_FOTO_FORMATO =
  'La foto debe ser una imagen JPG, PNG o GIF.';

export const MENSAJE_FOTO_MUY_GRANDE =
  'La foto supera los 2 MB. Probá con una imagen más liviana.';

const TIPOS_FOTO: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
};

/**
 * Valida una foto de perfil con los criterios habituales de plataformas como
 * Moodle: JPG, PNG o GIF y un peso acotado. No restringe dimensiones (se
 * reescalan al mostrarlas). Devuelve el mensaje de error o `null`.
 *
 * ⚠️ Igual que `validarArchivoPdf`, no es seguridad: la validación real por
 * contenido corresponde al servidor.
 */
export function validarFotoPerfil(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  const extensiones = TIPOS_FOTO[archivo.type];
  const esImagen = extensiones
    ? extensiones.some((e) => nombre.endsWith(e))
    : archivo.type === '' && Object.values(TIPOS_FOTO).flat().some((e) => nombre.endsWith(e));

  if (!esImagen) {
    return MENSAJE_FOTO_FORMATO;
  }

  if (archivo.size > TAMANO_MAXIMO_FOTO_BYTES) {
    return MENSAJE_FOTO_MUY_GRANDE;
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

/**
 * Dispara la descarga de un archivo que ya tenemos en memoria (un PDF que
 * devolvió la API).
 *
 * El navegador no deja "guardar un Blob" directamente: hay que darle una URL
 * temporal que lo represente y simular el click en un enlace. Esa URL vive en
 * memoria hasta que se la revoca, así que se libera apenas se usa — si no, el
 * archivo entero queda retenido mientras la pestaña siga abierta.
 *
 * Lo usan la entrega del programa de materia y el certificado de alumno
 * regular.
 */
export function descargarArchivo(archivo: Blob, nombre: string): void {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');

  enlace.href = url;
  enlace.download = nombre;
  enlace.click();

  URL.revokeObjectURL(url);
}
