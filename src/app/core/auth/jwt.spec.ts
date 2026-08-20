import { estaVencido, fechaDeVencimiento, leerPayloadJwt } from './jwt';

/**
 * Token real capturado de la API el 18/08/2026 (colección de Postman del QA).
 * Contenido: { nameid: "1", DNI: "43880335", role: "1",
 *              nbf: 1787094079, exp: 1787101279, iat: 1787094079 }
 */
const TOKEN_REAL =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJuYW1laWQiOiIxIiwiRE5JIjoiNDM4ODAzMzUiLCJyb2xlIjoiMSIsIm5iZiI6MTc4NzA5NDA3OSwiZXhwIjoxNzg3MTAxMjc5LCJpYXQiOjE3ODcwOTQwNzl9.' +
  'B1nJJDXSu_qqmxIn9pB1GQKhm6Ld13SFPJAE-QjPiGM';

describe('leerPayloadJwt', () => {
  it('lee el contenido de un token real de la API', () => {
    const payload = leerPayloadJwt(TOKEN_REAL);

    expect(payload).not.toBeNull();
    expect(payload!.DNI).toBe('43880335');
    expect(payload!.nameid).toBe('1');
    // El rol llega como ID en texto, no como nombre. Ver JwtPayload.
    expect(payload!.role).toBe('1');
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
    expect(fechaDeVencimiento(payload).getTime()).toBe(1787101279 * 1000);
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
