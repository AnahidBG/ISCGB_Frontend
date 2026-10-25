import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ATRIBUTO_TEMA, CLAVE_PREFERENCIA_TEMA } from './tema';
import { TemaService } from './tema.service';

/**
 * Un dispositivo de mentira. jsdom no trae `matchMedia`, así que se lo pone el
 * test: `cambiarA` hace lo que haría el sistema operativo al pasar de claro a
 * oscuro (avisar a quien está escuchando).
 */
function simularDispositivo(oscuro: boolean) {
  type Oyente = (evento: { matches: boolean }) => void;
  const oyentes = new Set<Oyente>();
  const consulta = {
    matches: oscuro,
    addEventListener: (_tipo: string, oyente: Oyente) => oyentes.add(oyente),
    removeEventListener: (_tipo: string, oyente: Oyente) => oyentes.delete(oyente),
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(consulta),
  });
  return {
    oyentes,
    cambiarA(nuevoOscuro: boolean) {
      consulta.matches = nuevoOscuro;
      oyentes.forEach((oyente) => oyente({ matches: nuevoOscuro }));
    },
  };
}

describe('TemaService', () => {
  /** Las funciones efecto (`effect`) corren al ciclar la aplicación. */
  const ciclar = () => TestBed.inject(ApplicationRef).tick();
  const temaEnHtml = () => document.documentElement.getAttribute(ATRIBUTO_TEMA);

  beforeEach(() => {
    localStorage.removeItem(CLAVE_PREFERENCIA_TEMA);
    document.documentElement.removeAttribute(ATRIBUTO_TEMA);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'matchMedia');
    localStorage.removeItem(CLAVE_PREFERENCIA_TEMA);
    document.documentElement.removeAttribute(ATRIBUTO_TEMA);
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
  });

  describe('al arrancar', () => {
    it('sin nada guardado acompaña al dispositivo: claro si el dispositivo es claro', () => {
      simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);

      expect(servicio.preferencia()).toBe('sistema');
      expect(servicio.tema()).toBe('claro');
      expect(servicio.esOscuro()).toBe(false);
    });

    it('sin nada guardado, con un dispositivo oscuro arranca oscuro', () => {
      simularDispositivo(true);
      const servicio = TestBed.inject(TemaService);

      expect(servicio.preferencia()).toBe('sistema');
      expect(servicio.tema()).toBe('oscuro');
      expect(servicio.esOscuro()).toBe(true);
    });

    it('retoma lo que la persona eligió la última vez, aunque el dispositivo diga otra cosa', () => {
      simularDispositivo(false);
      localStorage.setItem(CLAVE_PREFERENCIA_TEMA, 'oscuro');
      const servicio = TestBed.inject(TemaService);

      expect(servicio.preferencia()).toBe('oscuro');
      expect(servicio.tema()).toBe('oscuro');
    });

    it('un valor guardado que no es una preferencia se ignora', () => {
      simularDispositivo(false);
      localStorage.setItem(CLAVE_PREFERENCIA_TEMA, 'violeta');
      const servicio = TestBed.inject(TemaService);

      expect(servicio.preferencia()).toBe('sistema');
    });

    it('en un navegador sin matchMedia no falla y se queda en claro', () => {
      const servicio = TestBed.inject(TemaService);

      expect(servicio.tema()).toBe('claro');
    });
  });

  describe('establecer', () => {
    it('cambia el tema y recuerda la elección para la próxima visita', () => {
      simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);

      servicio.establecer('oscuro');

      expect(servicio.tema()).toBe('oscuro');
      expect(localStorage.getItem(CLAVE_PREFERENCIA_TEMA)).toBe('oscuro');
    });

    it('"sistema" vuelve a acompañar al dispositivo y también se recuerda', () => {
      simularDispositivo(true);
      localStorage.setItem(CLAVE_PREFERENCIA_TEMA, 'claro');
      const servicio = TestBed.inject(TemaService);
      expect(servicio.tema()).toBe('claro');

      servicio.establecer('sistema');

      expect(servicio.tema()).toBe('oscuro');
      expect(localStorage.getItem(CLAVE_PREFERENCIA_TEMA)).toBe('sistema');
    });
  });

  describe('alternar', () => {
    it('de claro pasa a oscuro y de oscuro a claro, fijando la elección', () => {
      simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);

      servicio.alternar();
      expect(servicio.tema()).toBe('oscuro');
      expect(servicio.preferencia()).toBe('oscuro');

      servicio.alternar();
      expect(servicio.tema()).toBe('claro');
      expect(servicio.preferencia()).toBe('claro');
    });

    it('con "sistema" alterna respecto de lo que se está viendo, no de lo que dice la preferencia', () => {
      simularDispositivo(true);
      const servicio = TestBed.inject(TemaService);
      expect(servicio.tema()).toBe('oscuro');

      servicio.alternar();

      expect(servicio.tema()).toBe('claro');
      expect(localStorage.getItem(CLAVE_PREFERENCIA_TEMA)).toBe('claro');
    });
  });

  describe('el dispositivo cambia mientras la aplicación está abierta', () => {
    it('con "sistema" lo acompaña', () => {
      const dispositivo = simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);

      dispositivo.cambiarA(true);
      expect(servicio.tema()).toBe('oscuro');

      dispositivo.cambiarA(false);
      expect(servicio.tema()).toBe('claro');
    });

    it('con una elección explícita no le hace caso', () => {
      const dispositivo = simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);
      servicio.establecer('claro');

      dispositivo.cambiarA(true);

      expect(servicio.tema()).toBe('claro');
    });

    it('al destruirse deja de escuchar al dispositivo', () => {
      const dispositivo = simularDispositivo(false);
      TestBed.inject(TemaService);
      expect(dispositivo.oyentes.size).toBe(1);

      TestBed.resetTestingModule();

      expect(dispositivo.oyentes.size).toBe(0);
    });
  });

  describe('en la página', () => {
    it('pone data-tema en <html> con el tema que se está pintando', () => {
      simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);

      ciclar();
      expect(temaEnHtml()).toBe('claro');

      servicio.establecer('oscuro');
      ciclar();
      expect(temaEnHtml()).toBe('oscuro');
    });

    it('si el dispositivo pasa a oscuro, <html> lo refleja', () => {
      const dispositivo = simularDispositivo(false);
      TestBed.inject(TemaService);
      ciclar();

      dispositivo.cambiarA(true);
      ciclar();

      expect(temaEnHtml()).toBe('oscuro');
    });

    it('le avisa al navegador el color de fondo del tema, sacado del token y sin espacios', () => {
      simularDispositivo(false);
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', 'anterior');
      document.head.appendChild(meta);
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: (nombre: string) => (nombre === '--color-fondo' ? ' #121614 ' : ''),
      } as unknown as CSSStyleDeclaration);
      TestBed.inject(TemaService);

      ciclar();

      expect(meta.getAttribute('content')).toBe('#121614');
    });

    it('si el token no está disponible deja el color como estaba', () => {
      simularDispositivo(false);
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', 'anterior');
      document.head.appendChild(meta);
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: () => '',
      } as unknown as CSSStyleDeclaration);
      TestBed.inject(TemaService);

      ciclar();

      expect(meta.getAttribute('content')).toBe('anterior');
    });
  });

  describe('sin almacenamiento', () => {
    it('si leer falla, arranca con la preferencia inicial', () => {
      simularDispositivo(false);
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('bloqueado', 'SecurityError');
      });

      const servicio = TestBed.inject(TemaService);

      expect(servicio.preferencia()).toBe('sistema');
    });

    it('si guardar falla, la elección igual vale para esta visita', () => {
      simularDispositivo(false);
      const servicio = TestBed.inject(TemaService);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('lleno', 'QuotaExceededError');
      });

      expect(() => servicio.establecer('oscuro')).not.toThrow();
      expect(servicio.tema()).toBe('oscuro');
    });
  });
});
