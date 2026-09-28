import { HttpErrorResponse } from '@angular/common/http';
import { esEndpointInexistente, mensajeDelServidor } from './error-api';

function errorCon(status: number, error: unknown): HttpErrorResponse {
  return new HttpErrorResponse({ status, error });
}

describe('mensajeDelServidor', () => {
  it('lee un string suelto (BadRequest("texto"))', () => {
    expect(mensajeDelServidor(errorCon(400, 'Rol inválido.'))).toBe('Rol inválido.');
  });

  it('lee { message }', () => {
    expect(mensajeDelServidor(errorCon(400, { message: 'Debes adjuntar en formato PDF' }))).toBe(
      'Debes adjuntar en formato PDF',
    );
  });

  it('junta los errores de validación de ASP.NET', () => {
    const cuerpo = {
      title: 'One or more validation errors occurred.',
      errors: { Cuil: ['The Cuil field is required.'], Genero: ['The Genero field is required.'] },
    };
    expect(mensajeDelServidor(errorCon(400, cuerpo))).toBe(
      'The Cuil field is required. The Genero field is required.',
    );
  });

  it('ignora cuerpos vacíos o HTML', () => {
    expect(mensajeDelServidor(errorCon(404, null))).toBeNull();
    expect(mensajeDelServidor(errorCon(500, '<html>error</html>'))).toBeNull();
  });
});

describe('esEndpointInexistente', () => {
  it('404 sin cuerpo = la ruta no está publicada', () => {
    expect(esEndpointInexistente(errorCon(404, null))).toBe(true);
    expect(esEndpointInexistente(errorCon(405, ''))).toBe(true);
  });

  it('404 con motivo = el controlador respondió NotFound a propósito', () => {
    expect(esEndpointInexistente(errorCon(404, 'Usuario no encontrado.'))).toBe(false);
  });

  it('NotFound() a secas manda ProblemDetails: tampoco es una ruta inexistente', () => {
    expect(esEndpointInexistente(errorCon(404, { title: 'Not Found', status: 404 }))).toBe(false);
  });

  it('otros códigos nunca son "ruta inexistente"', () => {
    expect(esEndpointInexistente(errorCon(500, null))).toBe(false);
  });
});
