import { JwtPayload } from './modelos/jwt-payload';

/**
 * Un JWT son tres partes separadas por punto: cabecera.contenido.firma
 * El contenido está en base64url, así que se puede leer sin ninguna librería.
 *
 * ⚠️ Leer el token NO es lo mismo que verificarlo. Cualquiera puede fabricar
 * un token con el rol que quiera y esta función se lo va a creer.
 * La firma solo la puede validar el backend, que tiene la clave secreta.
 *
 * Por eso: lo que leemos acá sirve para decidir QUÉ MOSTRAR, nunca para
 * decidir qué permitir. Un guard del lado del cliente es comodidad visual,
 * no seguridad.
 */
export function leerPayloadJwt(token: string): JwtPayload | null {
  const partes = token.split('.');
  if (partes.length !== 3) {
    return null;
  }

  try {
    const contenido = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(contenido)
        .split('')
        .map((caracter) => '%' + caracter.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Convierte el `exp` del token (segundos desde 1970) en una fecha real. */
export function fechaDeVencimiento(payload: JwtPayload): Date {
  return new Date(payload.exp * 1000);
}

/** ¿El token ya venció? Los tokens de ISCGB duran 2 horas. */
export function estaVencido(payload: JwtPayload): boolean {
  return fechaDeVencimiento(payload).getTime() <= Date.now();
}
