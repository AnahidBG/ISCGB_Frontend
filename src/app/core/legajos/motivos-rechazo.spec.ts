import { MOTIVOS_RECHAZO, comentarioDeRechazo } from './motivos-rechazo';

describe('MOTIVOS_RECHAZO', () => {
  it('son los 7 motivos de la institución, con sus textos y en su orden', () => {
    expect(MOTIVOS_RECHAZO).toEqual([
      'Dato de importancia ilegible',
      'El escaneo no permite distinguir información importante',
      'Falta información imprescindible',
      'Falta sello y/o firma',
      'Documento incompleto',
      'No se encuentra en formato pdf',
      'No corresponde a lo solicitado',
    ]);
  });
});

describe('comentarioDeRechazo', () => {
  it('con un motivo, el comentario es ese motivo', () => {
    expect(comentarioDeRechazo(['Documento incompleto'])).toBe('Documento incompleto');
  });

  it('con varios, los une con "; "', () => {
    expect(comentarioDeRechazo(['Falta sello y/o firma', 'Documento incompleto'])).toBe(
      'Falta sello y/o firma; Documento incompleto',
    );
  });

  it('respeta el orden de la lista oficial, no el orden en que se marcaron', () => {
    expect(comentarioDeRechazo(['No corresponde a lo solicitado', 'Dato de importancia ilegible'])).toBe(
      'Dato de importancia ilegible; No corresponde a lo solicitado',
    );
  });

  it('con aclaración, la agrega al final', () => {
    expect(comentarioDeRechazo(['Documento incompleto'], 'falta la hoja 2')).toBe(
      'Documento incompleto. Aclaración: falta la hoja 2',
    );
  });

  it('a la aclaración le saca los espacios y saltos de línea sobrantes', () => {
    expect(comentarioDeRechazo(['Documento incompleto'], '  falta la\n  hoja 2  ')).toBe(
      'Documento incompleto. Aclaración: falta la hoja 2',
    );
  });

  it.each([
    ['vacía', ''],
    ['con solo espacios', '   \n  '],
  ])('con la aclaración %s, no agrega nada', (_caso, aclaracion) => {
    expect(comentarioDeRechazo(['Falta sello y/o firma'], aclaracion)).toBe('Falta sello y/o firma');
  });

  it('sin motivos no hay comentario válido, aunque haya aclaración', () => {
    expect(comentarioDeRechazo([], 'falta la hoja 2')).toBe('');
  });
});
