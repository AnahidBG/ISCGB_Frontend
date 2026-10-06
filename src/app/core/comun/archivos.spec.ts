import { describe, expect, it } from 'vitest';
import {
  MENSAJE_FOTO_FORMATO,
  MENSAJE_FOTO_MUY_GRANDE,
  TAMANO_MAXIMO_FOTO_BYTES,
  validarFotoPerfil,
} from './archivos';

function archivo(nombre: string, tipo: string, bytes = 10): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

describe('validarFotoPerfil', () => {
  it('acepta JPG, PNG y GIF', () => {
    expect(validarFotoPerfil(archivo('a.jpg', 'image/jpeg'))).toBeNull();
    expect(validarFotoPerfil(archivo('a.JPEG', 'image/jpeg'))).toBeNull();
    expect(validarFotoPerfil(archivo('a.png', 'image/png'))).toBeNull();
    expect(validarFotoPerfil(archivo('a.gif', 'image/gif'))).toBeNull();
  });

  it('acepta type vacío si la extensión es válida', () => {
    expect(validarFotoPerfil(archivo('a.png', ''))).toBeNull();
  });

  it('rechaza otros formatos', () => {
    expect(validarFotoPerfil(archivo('a.pdf', 'application/pdf'))).toBe(MENSAJE_FOTO_FORMATO);
    expect(validarFotoPerfil(archivo('a.png', 'application/pdf'))).toBe(MENSAJE_FOTO_FORMATO);
    expect(validarFotoPerfil(archivo('a.bmp', ''))).toBe(MENSAJE_FOTO_FORMATO);
  });

  it('rechaza fotos que superan el tope', () => {
    const grande = archivo('a.jpg', 'image/jpeg', TAMANO_MAXIMO_FOTO_BYTES + 1);
    expect(validarFotoPerfil(grande)).toBe(MENSAJE_FOTO_MUY_GRANDE);
  });
});
