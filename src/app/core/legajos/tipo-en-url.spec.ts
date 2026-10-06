import { convertToParamMap } from '@angular/router';
import { DocumentoRequerido } from './modelos/documento-requerido';
import { consultaConTipo, tipoPedidoEn } from './tipo-en-url';

const TIPOS: DocumentoRequerido[] = [
  { idTipoDoc: 7, nombreDocumento: 'DNI', obligatorio: true, anual: false },
  { idTipoDoc: 12, nombreDocumento: 'Apto médico', obligatorio: true, anual: true },
];

describe('consultaConTipo', () => {
  it('arma el query param con el id del tipo', () => {
    expect(consultaConTipo(12)).toEqual({ tipo: '12' });
  });
});

describe('tipoPedidoEn', () => {
  it('devuelve el tipo que pide la URL si es uno de los que puede subir', () => {
    expect(tipoPedidoEn(convertToParamMap(consultaConTipo(12)), TIPOS)).toBe(12);
  });

  it('sin ?tipo= no elige nada', () => {
    expect(tipoPedidoEn(convertToParamMap({}), TIPOS)).toBeNull();
  });

  it('un tipo que no le corresponde a su rol no se elige', () => {
    // Un enlace viejo o escrito a mano: subir algo que el instituto no le pide
    // terminaría en un documento que no cuenta para su legajo.
    expect(tipoPedidoEn(convertToParamMap({ tipo: '99' }), TIPOS)).toBeNull();
  });

  it.each(['abc', '7.5', '-7', ' 7', '', '7abc'])(
    'ignora un valor que no es un id: "%s"',
    (valor) => {
      expect(tipoPedidoEn(convertToParamMap({ tipo: valor }), TIPOS)).toBeNull();
    },
  );

  it('mientras no cargaron los tipos no elige nada', () => {
    expect(tipoPedidoEn(convertToParamMap({ tipo: '7' }), [])).toBeNull();
  });
});
