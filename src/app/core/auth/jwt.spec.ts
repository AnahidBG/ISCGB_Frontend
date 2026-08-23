import { estaVencido, fechaDeVencimiento, leerPayloadJwt } from './jwt';

/**
 * Token real capturado de la API el 23/08/2026, contra el backend corriendo.
 * Contenido: { nameid: "1", DNI: "43880335", role: "Director",
 *              nbf: 1787517118, exp: 1787524318, iat: 1787517118 }
 *
 * Reemplaza al token del 18/08, que traía `role: "1"`. El backend pasó a
 * mandar el NOMBRE del rol en vez del ID, y este archivo es el que deja
 * constancia de ese cambio de contrato.
 */
const TOKEN_REAL =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJuYW1laWQiOiIxIiwiRE5JIjoiNDM4ODAzMzUiLCJyb2xlIjoiRGlyZWN0b3IiLCJuYmYiOjE3ODc1MTcxMTgsImV4cCI6MTc4NzUyNDMxOCwiaWF0IjoxNzg3NTE3MTE4fQ.' +
  'GwrTlEgs2T-vj3hp0WPpfVZAKBHI9NVUUAioo9Aaa7M';

/**
 * Token con DOS roles, armado a mano con la misma forma que produce el
 * backend cuando el usuario tiene más de uno.
 *
 * El `AuthController` agrega un claim `role` por cada rol, y el JWT los
 * junta en un arreglo. Este caso no se puede capturar de la API hasta que
 * exista una persona con dos roles cargados, pero el formato es el que
 * define la especificación del JWT y hay que contemplarlo desde ahora.
 */
const TOKEN_CON_DOS_ROLES =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJuYW1laWQiOiIzIiwiRE5JIjoiNDA1NTUxMTEiLCJyb2xlIjpbIkRpcmVjdG9yIiwiRG9jZW50ZSJdLCJuYmYiOjE3ODc1MTcxMTgsImV4cCI6MTc4NzUyNDMxOCwiaWF0IjoxNzg3NTE3MTE4fQ.' +
  'firma-de-mentira';

describe('leerPayloadJwt', () => {
  it('lee el contenido de un token real de la API', () => {
    const payload = leerPayloadJwt(TOKEN_REAL);

    expect(payload).not.toBeNull();
    expect(payload!.DNI).toBe('43880335');
    expect(payload!.nameid).toBe('1');
    // El rol llega con su NOMBRE, no con el ID. Ver JwtPayload.
    expect(payload!.role).toBe('Director');
  });

  it('lee el rol como arreglo cuando el usuario tiene varios', () => {
    const payload = leerPayloadJwt(TOKEN_CON_DOS_ROLES);

    expect(payload).not.toBeNull();
    expect(payload!.role).toEqual(['Director', 'Docente']);
  });

  it('devuelve null si el token no tiene tres partes', () => {
    expect(leerPayloadJwt('esto-no-es-un-token')).toBeNull();
  });

  it('devuelve null si el contenido no es JSON válido', () => {
    expect(leerPayloadJwt('aaa.bbb.ccc')).toBeNull();
  });

  it('devuelve null con el string vacío', () => {
    expect(leerPayloadJwt('')).toBeNull();
  });
});

describe('fechaDeVencimiento', () => {
  it('convierte el exp del token en una fecha', () => {
    const payload = leerPayloadJwt(TOKEN_REAL)!;
    expect(fechaDeVencimiento(payload).getTime()).toBe(1787524318 * 1000);
  });

  it('confirma que los tokens de ISCGB duran 2 horas', () => {
    const payload = leerPayloadJwt(TOKEN_REAL)!;
    const duracionEnHoras = (payload.exp - payload.iat) / 3600;
    expect(duracionEnHoras).toBe(2);
  });
});

describe('estaVencido', () => {
  it('marca como vencido un token del pasado', () => {
    const payload = leerPayloadJwt(TOKEN_REAL)!;
    expect(estaVencido({ ...payload, exp: 1 })).toBe(true);
  });

  it('no marca como vencido un token que todavía no venció', () => {
    const payload = leerPayloadJwt(TOKEN_REAL)!;
    const dentroDeUnaHora = Math.floor(Date.now() / 1000) + 3600;
    expect(estaVencido({ ...payload, exp: dentroDeUnaHora })).toBe(false);
  });
});
