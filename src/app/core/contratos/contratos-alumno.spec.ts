import { MENSAJE_NO_ES_PDF } from '../comun/archivos';
import {
  ValoresNuevoContrato,
  aNuevoContrato,
  erroresDeNuevoContrato,
  nombreDeDescarga,
} from './contratos-alumno';

const PDF = new File(['%PDF-1.4'], 'convenio.pdf', { type: 'application/pdf' });

const COMPLETOS: ValoresNuevoContrato = {
  idUsuario: '15',
  nombre: '  Convenio Beca Fundación Encode  ',
  archivo: PDF,
};

describe('erroresDeNuevoContrato', () => {
  it('con alumno, nombre y PDF no hay errores', () => {
    expect(erroresDeNuevoContrato(COMPLETOS)).toEqual({});
  });

  it('pide el alumno, el nombre y el archivo', () => {
    expect(erroresDeNuevoContrato({ idUsuario: '', nombre: '   ', archivo: null })).toEqual({
      idUsuario: 'Elegí el alumno.',
      nombre: 'Escribí el nombre del contrato.',
      archivo: 'Adjuntá el contrato en PDF.',
    });
  });

  it('no deja un nombre de más de 100 caracteres ni un archivo que no sea PDF', () => {
    const errores = erroresDeNuevoContrato({
      ...COMPLETOS,
      nombre: 'a'.repeat(101),
      archivo: new File(['x'], 'convenio.docx'),
    });

    expect(errores.nombre).toBe('El nombre puede tener hasta 100 caracteres.');
    expect(errores.archivo).toBe(MENSAJE_NO_ES_PDF);
  });
});

describe('aNuevoContrato', () => {
  it('pasa el alumno a número y recorta el nombre', () => {
    expect(aNuevoContrato(COMPLETOS)).toEqual({
      idUsuario: 15,
      nombre: 'Convenio Beca Fundación Encode',
      archivo: PDF,
    });
  });
});

describe('nombreDeDescarga', () => {
  it('arma un nombre de archivo sin acentos ni espacios', () => {
    expect(nombreDeDescarga('Convenio Beca Fundación Encode 2026')).toBe(
      'Convenio_Beca_Fundacion_Encode_2026.pdf',
    );
    expect(nombreDeDescarga('???')).toBe('Contrato.pdf');
  });
});
