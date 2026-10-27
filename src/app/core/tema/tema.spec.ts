import {
  CLAVE_PREFERENCIA_TEMA,
  PREFERENCIAS_TEMA,
  PREFERENCIA_TEMA_INICIAL,
  PreferenciaTema,
  TemaAplicado,
  esPreferenciaTema,
  leerPreferenciaTema,
  resolverTema,
  temaOpuesto,
} from './tema';

describe('tema', () => {
  describe('esPreferenciaTema', () => {
    it.each(['claro', 'oscuro', 'sistema'])('"%s" es una preferencia válida', (valor) => {
      expect(esPreferenciaTema(valor)).toBe(true);
    });

    it.each([null, undefined, '', 'Oscuro', 'dark', 'auto', 1, {}])('%j no lo es', (valor) => {
      expect(esPreferenciaTema(valor)).toBe(false);
    });
  });

  describe('leerPreferenciaTema', () => {
    it.each<PreferenciaTema>(['claro', 'oscuro', 'sistema'])(
      'devuelve "%s" si eso había guardado',
      (guardado) => {
        expect(leerPreferenciaTema(guardado)).toBe(guardado);
      },
    );

    it('sin nada guardado sigue al dispositivo', () => {
      expect(leerPreferenciaTema(null)).toBe('sistema');
      expect(leerPreferenciaTema(undefined)).toBe('sistema');
      expect(PREFERENCIA_TEMA_INICIAL).toBe('sistema');
    });

    it('un valor desconocido se trata como si nunca hubiera elegido', () => {
      expect(leerPreferenciaTema('violeta')).toBe('sistema');
      expect(leerPreferenciaTema('')).toBe('sistema');
    });
  });

  describe('resolverTema', () => {
    it.each<[PreferenciaTema, boolean, TemaAplicado]>([
      ['claro', false, 'claro'],
      ['claro', true, 'claro'],
      ['oscuro', false, 'oscuro'],
      ['oscuro', true, 'oscuro'],
      ['sistema', false, 'claro'],
      ['sistema', true, 'oscuro'],
    ])(
      'preferencia "%s" con dispositivo oscuro=%s pinta "%s"',
      (preferencia, sistema, esperado) => {
        expect(resolverTema(preferencia, sistema)).toBe(esperado);
      },
    );

    it('una elección explícita le gana al dispositivo', () => {
      expect(resolverTema('claro', true)).toBe('claro');
      expect(resolverTema('oscuro', false)).toBe('oscuro');
    });
  });

  describe('temaOpuesto', () => {
    it('alterna entre los dos temas', () => {
      expect(temaOpuesto('claro')).toBe('oscuro');
      expect(temaOpuesto('oscuro')).toBe('claro');
    });
  });

  it('las preferencias van en el orden del selector y sin repetirse', () => {
    expect([...PREFERENCIAS_TEMA]).toEqual(['claro', 'oscuro', 'sistema']);
    expect(new Set(PREFERENCIAS_TEMA).size).toBe(PREFERENCIAS_TEMA.length);
  });

  it('la clave de almacenamiento sigue el estilo "iscgb.…" del resto de las preferencias', () => {
    expect(CLAVE_PREFERENCIA_TEMA).toMatch(/^iscgb\./);
  });
});
