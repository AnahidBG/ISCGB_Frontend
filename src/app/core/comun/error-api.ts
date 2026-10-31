import { HttpErrorResponse } from '@angular/common/http';

/**
 * Saca un mensaje legible del cuerpo de un error de la API, o `null` si no
 * hay ninguno que valga la pena mostrar.
 *
 * El backend no responde los errores con una sola forma, y las tres
 * aparecen en endpoints que usa el frontend:
 *
 *   · `BadRequest("texto")`             → el cuerpo es un string suelto
 *                                          (`UsuariosAdminController`).
 *   · `BadRequest(new { message })`     → `{ message: "..." }`
 *                                          (Legajos, Justificativos, Certificados).
 *   · Validación automática de ASP.NET  → `ValidationProblemDetails`:
 *                                          `{ title, errors: { Campo: ["..."] } }`
 *                                          (cuando un `[Required]` falta).
 *
 * Mostrar el mensaje del servidor importa en los casos de negocio — "Ya
 * existe un director suplente asignado con el nombre: X" es exactamente lo
 * que el criterio de aceptación pide mostrar, y ningún texto genérico del
 * frontend lo puede reemplazar.
 */
export function mensajeDelServidor(error: HttpErrorResponse): string | null {
  const cuerpo: unknown = error.error;

  if (typeof cuerpo === 'string') {
    const texto = cuerpo.trim();
    // Una página HTML de error (proxy, IIS) no es un mensaje para la persona.
    return texto !== '' && !texto.startsWith('<') ? texto : null;
  }

  if (cuerpo === null || typeof cuerpo !== 'object') {
    return null;
  }

  const objeto = cuerpo as Record<string, unknown>;

  for (const clave of ['message', 'mensaje']) {
    const valor = objeto[clave];
    if (typeof valor === 'string' && valor.trim() !== '') {
      return valor.trim();
    }
  }

  const errores = objeto['errors'];
  if (errores !== null && typeof errores === 'object') {
    const mensajes = Object.values(errores as Record<string, unknown>)
      .flatMap((valor) => (Array.isArray(valor) ? valor : [valor]))
      .filter((valor): valor is string => typeof valor === 'string' && valor.trim() !== '');
    if (mensajes.length > 0) {
      return mensajes.join(' ');
    }
  }

  return null;
}

/**
 * ¿El 404/405 es "esa ruta no existe en el servidor" y no un `NotFound()` del
 * controlador?
 *
 * ASP.NET responde una ruta no mapeada con 404 y el cuerpo VACÍO. Un
 * controlador con `[ApiController]` que responde `NotFound(...)` siempre
 * manda ALGO: el objeto que le pasaron, un texto, o — con `NotFound()` a
 * secas — un `ProblemDetails` (`{ title: "Not Found", status: 404 }`). La
 * diferencia importa: "el backend todavía no publicó este endpoint" y "esa
 * persona no existe" piden mensajes completamente distintos.
 */
export function esEndpointInexistente(error: HttpErrorResponse): boolean {
  if (error.status !== 404 && error.status !== 405) {
    return false;
  }
  const cuerpo: unknown = error.error;
  return (
    cuerpo === null || cuerpo === undefined || (typeof cuerpo === 'string' && cuerpo.trim() === '')
  );
}

/**
 * El mensaje que ve la persona si una escritura falla. El del backend primero,
 * pero solo si es un rechazo del pedido (4xx con texto): ahí explica qué pasó
 * ("El docente ya se encuentra asignado…"). Un 5xx o una ruta que no existe no
 * le dicen nada útil a quien está en la pantalla: mensaje genérico y el detalle
 * a la consola, con `registro` adelante.
 */
export function traducirRechazo(
  error: HttpErrorResponse,
  generico: string,
  registro: string,
): string {
  const delServidor = mensajeDelServidor(error);
  const esRechazoDelPedido =
    error.status >= 400 && error.status < 500 && !esEndpointInexistente(error);

  if (delServidor !== null && esRechazoDelPedido) {
    return delServidor;
  }
  console.error(registro, error);
  return generico;
}
