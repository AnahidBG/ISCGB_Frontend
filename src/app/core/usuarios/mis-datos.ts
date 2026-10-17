import { MisDatos, MisDatosAEnviar } from './modelos/mis-datos';
import { UsuarioDetalle } from './modelos/usuario-detalle';

/**
 * Las reglas de "Mi perfil", en funciones puras para probarlas sin `TestBed`.
 *
 * Todo gira alrededor de cómo se comporta `PUT /api/Usuarios/mi-perfil`
 * (`UsuarioController.ActualizarPerfil`). Desde el 17/10/2026 (commit `d771acb`):
 *
 *   · Un texto que llega vacío BORRA el dato (`""` → `null`), y uno ausente se
 *     deja como estaba. La provincia con un id menor o igual a 0 también se borra.
 *   · El correo es la excepción: uno vacío se ignora. Por eso es obligatorio.
 *
 * Por eso `datosAEnviar` manda todos los campos, y `erroresDeMisDatos` deja
 * vaciar cualquiera menos el correo. Antes el backend ignoraba los vacíos y no
 * había forma de borrar un dato.
 */

/** Los campos de texto, en el orden en que se muestran. */
export const CAMPOS_DE_TEXTO = [
  'email',
  'telefono',
  'telefonoEmergencia',
  'contactoEmergencia',
  'direccion',
  'lugarNacimiento',
] as const;

/** El nombre de un campo de texto de `MisDatos`: todos menos la provincia. */
export type CampoDeTexto = (typeof CAMPOS_DE_TEXTO)[number];

/** Qué campos tienen un error y cuál es, para mostrarlo junto a cada uno. */
export type ErroresDeMisDatos = Partial<Record<keyof MisDatos, string>>;

/**
 * El largo de cada columna de `Usuarios` (`varchar(n)`). Pasado ese largo
 * SQL Server corta el guardado con un error 500 que no le dice nada a la persona.
 */
export const LARGO_MAXIMO: Readonly<Record<CampoDeTexto, number>> = {
  email: 150,
  telefono: 30,
  telefonoEmergencia: 30,
  contactoEmergencia: 150,
  direccion: 255,
  lugarNacimiento: 150,
};

/** La provincia que se manda para borrarla: el backend lee un id <= 0 como "ninguna". */
const SIN_PROVINCIA = 0;

const MENSAJE_CORREO_VACIO = 'Ingresá tu correo electrónico.';
const MENSAJE_CORREO_INVALIDO = 'Ese correo no parece válido.';
const MENSAJE_TELEFONO_INVALIDO =
  'Ese teléfono no parece válido. Usá solo números, con el código de área.';

/** Algo, una arroba, algo, un punto y algo más; sin espacios. No pretende ser el RFC 5322. */
const FORMATO_DE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Números, espacios, guiones, puntos y paréntesis, con un "+" opcional al principio. */
const CARACTERES_DE_TELEFONO = /^\+?[\d\s().-]+$/;
const DIGITOS_MINIMOS_DE_TELEFONO = 6;
/** El máximo internacional (E.164): cubre el "0" y el "15" con que se marca en el país. */
const DIGITOS_MAXIMOS_DE_TELEFONO = 15;

/** Los datos editables de una persona, tal como los devuelve `GET /api/Usuarios/{id}`. */
export function misDatosDe(detalle: UsuarioDetalle): MisDatos {
  return {
    email: detalle.email,
    telefono: detalle.telefono ?? '',
    telefonoEmergencia: detalle.telefonoEmergencia ?? '',
    contactoEmergencia: detalle.contactoEmergencia ?? '',
    direccion: detalle.direccion ?? '',
    lugarNacimiento: detalle.lugarNacimiento ?? '',
    idProvincia: detalle.idProvincia,
  };
}

/** Los mismos datos con los textos sin los espacios de los costados. */
export function limpiarMisDatos(datos: MisDatos): MisDatos {
  return {
    email: datos.email.trim(),
    telefono: datos.telefono.trim(),
    telefonoEmergencia: datos.telefonoEmergencia.trim(),
    contactoEmergencia: datos.contactoEmergencia.trim(),
    direccion: datos.direccion.trim(),
    lugarNacimiento: datos.lugarNacimiento.trim(),
    idProvincia: datos.idProvincia,
  };
}

/**
 * Lo que viaja al backend: TODOS los campos, recortados. Uno vacío viaja vacío
 * para que el backend lo borre, y sin provincia viaja `SIN_PROVINCIA`.
 */
export function datosAEnviar(datos: MisDatos): MisDatosAEnviar {
  const limpios = limpiarMisDatos(datos);
  return { ...limpios, idProvincia: limpios.idProvincia ?? SIN_PROVINCIA };
}

/** ¿Lo que hay en el formulario es distinto de lo que está guardado? Sin contar espacios. */
export function hayCambios(actuales: MisDatos, guardados: MisDatos): boolean {
  const escritos = limpiarMisDatos(actuales);
  const previos = limpiarMisDatos(guardados);

  return (
    escritos.idProvincia !== previos.idProvincia ||
    CAMPOS_DE_TEXTO.some((campo) => escritos[campo] !== previos[campo])
  );
}

/**
 * Qué campos no se pueden guardar y por qué. Vacío (`{}`) si está todo bien.
 *
 * Recibe lo guardado además de lo escrito porque un dato que no se tocó no se
 * vuelve a revisar: lo que ya está en la base pudo cargarse con otro criterio y
 * no tiene por qué impedir cambiar otro campo.
 *
 *   · El correo es siempre obligatorio y tiene que parecer un correo: el backend
 *     ignora uno vacío, así que no se puede borrar.
 *   · Cualquier otro dato se puede dejar vacío: así se borra.
 *   · Los teléfonos, si hay algo escrito, tienen que parecer un teléfono.
 */
export function erroresDeMisDatos(actuales: MisDatos, guardados: MisDatos): ErroresDeMisDatos {
  const escritos = limpiarMisDatos(actuales);
  const previos = limpiarMisDatos(guardados);
  const errores: ErroresDeMisDatos = {};

  for (const campo of CAMPOS_DE_TEXTO) {
    const valor = escritos[campo];

    if (valor === '') {
      if (campo === 'email') {
        errores.email = MENSAJE_CORREO_VACIO;
      }
      continue;
    }
    if (valor === previos[campo]) {
      continue;
    }

    const error = ERROR_DE_FORMATO[campo](valor) ?? errorDeLargo(valor, LARGO_MAXIMO[campo]);
    if (error !== null) {
      errores[campo] = error;
    }
  }
  return errores;
}

function errorDeCorreo(correo: string): string | null {
  return FORMATO_DE_CORREO.test(correo) ? null : MENSAJE_CORREO_INVALIDO;
}

function errorDeTelefono(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, '').length;
  const valido =
    CARACTERES_DE_TELEFONO.test(telefono) &&
    digitos >= DIGITOS_MINIMOS_DE_TELEFONO &&
    digitos <= DIGITOS_MAXIMOS_DE_TELEFONO;

  return valido ? null : MENSAJE_TELEFONO_INVALIDO;
}

function sinFormato(): null {
  return null;
}

function errorDeLargo(valor: string, maximo: number): string | null {
  return valor.length > maximo ? `No puede tener más de ${maximo} caracteres.` : null;
}

/** Tabla por clave: qué formato pide cada campo de texto. Los libres no piden ninguno. */
const ERROR_DE_FORMATO: Readonly<Record<CampoDeTexto, (valor: string) => string | null>> = {
  email: errorDeCorreo,
  telefono: errorDeTelefono,
  telefonoEmergencia: errorDeTelefono,
  contactoEmergencia: sinFormato,
  direccion: sinFormato,
  lugarNacimiento: sinFormato,
};
