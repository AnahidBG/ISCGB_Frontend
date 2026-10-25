import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ATRIBUTO_TEMA, CLAVE_PREFERENCIA_TEMA } from '../../../core/tema/tema';
import { TemaService } from '../../../core/tema/tema.service';
import { SelectorTema, VarianteSelectorTema } from './selector-tema';

describe('SelectorTema', () => {
  let fixture: ComponentFixture<SelectorTema>;
  let el: HTMLElement;
  let tema: TemaService;

  async function montar(variante: VarianteSelectorTema = 'segmentos', enMenu = false) {
    fixture = TestBed.createComponent(SelectorTema);
    fixture.componentRef.setInput('variante', variante);
    fixture.componentRef.setInput('enMenu', enMenu);
    tema = TestBed.inject(TemaService);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  const botones = () => Array.from(el.querySelectorAll<HTMLButtonElement>('button'));
  const opcion = (texto: string) => botones().find((boton) => boton.textContent?.trim() === texto)!;

  /** Cuántos trazos dibuja el ícono: la luna es uno solo y el sol son dos (círculo y rayos). */
  const trazosDelIcono = () => el.querySelectorAll('button svg > *').length;

  beforeEach(() => {
    localStorage.removeItem(CLAVE_PREFERENCIA_TEMA);
    document.documentElement.removeAttribute(ATRIBUTO_TEMA);
  });

  afterEach(() => {
    localStorage.removeItem(CLAVE_PREFERENCIA_TEMA);
    document.documentElement.removeAttribute(ATRIBUTO_TEMA);
  });

  describe('con las tres opciones (segmentos)', () => {
    it('muestra Claro, Oscuro y Automático, en ese orden, cada una con su ícono', async () => {
      await montar();

      expect(botones().map((boton) => boton.textContent?.trim())).toEqual([
        'Claro',
        'Oscuro',
        'Automático',
      ]);
      expect(botones().every((boton) => boton.querySelector('svg') !== null)).toBe(true);
    });

    it('sin elección previa queda marcado "Automático", que acompaña al dispositivo', async () => {
      await montar();

      expect(botones().map((boton) => boton.getAttribute('aria-checked'))).toEqual([
        'false',
        'false',
        'true',
      ]);
    });

    it('elegir "Oscuro" lo marca, desmarca el resto y lo guarda', async () => {
      await montar();

      opcion('Oscuro').click();
      await fixture.whenStable();

      expect(tema.preferencia()).toBe('oscuro');
      expect(tema.tema()).toBe('oscuro');
      expect(localStorage.getItem(CLAVE_PREFERENCIA_TEMA)).toBe('oscuro');
      expect(botones().map((boton) => boton.getAttribute('aria-checked'))).toEqual([
        'false',
        'true',
        'false',
      ]);
    });

    it('se puede volver a "Claro" y a "Automático"', async () => {
      await montar();

      opcion('Oscuro').click();
      await fixture.whenStable();
      opcion('Claro').click();
      await fixture.whenStable();
      expect(tema.preferencia()).toBe('claro');

      opcion('Automático').click();
      await fixture.whenStable();
      expect(tema.preferencia()).toBe('sistema');
    });

    it('arranca marcando lo que la persona eligió la última vez', async () => {
      localStorage.setItem(CLAVE_PREFERENCIA_TEMA, 'claro');

      await montar();

      expect(opcion('Claro').getAttribute('aria-checked')).toBe('true');
      expect(opcion('Automático').getAttribute('aria-checked')).toBe('false');
    });

    it('la opción elegida no se distingue solo por el color: va en negrita y con relieve', async () => {
      await montar();

      const elegida = opcion('Automático');
      const libre = opcion('Claro');

      expect(elegida.classList.contains('font-semibold')).toBe(true);
      expect(elegida.classList.contains('shadow-marca-sm')).toBe(true);
      expect(libre.classList.contains('font-semibold')).toBe(false);
      expect(libre.classList.contains('shadow-marca-sm')).toBe(false);
    });

    it('"Automático" explica con una ayuda qué hace', async () => {
      await montar();

      expect(opcion('Automático').getAttribute('title')).toContain('dispositivo');
    });

    it('fuera de un menú es un grupo de opciones de radio con nombre "Apariencia"', async () => {
      await montar();

      const grupo = el.querySelector('[aria-label="Apariencia"]')!;
      expect(grupo.getAttribute('role')).toBe('radiogroup');
      expect(botones().every((boton) => boton.getAttribute('role') === 'radio')).toBe(true);
    });

    it('dentro de un menú usa los roles de menú: grupo y menuitemradio', async () => {
      await montar('segmentos', true);

      const grupo = el.querySelector('[aria-label="Apariencia"]')!;
      expect(grupo.getAttribute('role')).toBe('group');
      expect(botones().every((boton) => boton.getAttribute('role') === 'menuitemradio')).toBe(true);
    });

    it('todos son botones que no envían formularios', async () => {
      await montar();

      expect(botones().every((boton) => boton.type === 'button')).toBe(true);
    });
  });

  describe('de un solo toque (botón)', () => {
    it('es un único botón, sin las tres opciones', async () => {
      await montar('boton');

      expect(botones().length).toBe(1);
      expect(el.querySelector('[aria-label="Apariencia"]')).toBeNull();
    });

    it('con el tema claro ofrece pasar al oscuro, y lo dice con palabras', async () => {
      await montar('boton');

      expect(botones()[0].getAttribute('aria-label')).toBe('Activar modo oscuro');
      expect(botones()[0].getAttribute('title')).toBe('Activar modo oscuro');
    });

    it('al tocarlo pasa a oscuro, ofrece volver a claro y recuerda la elección', async () => {
      await montar('boton');

      botones()[0].click();
      await fixture.whenStable();

      expect(tema.tema()).toBe('oscuro');
      expect(botones()[0].getAttribute('aria-label')).toBe('Activar modo claro');
      expect(localStorage.getItem(CLAVE_PREFERENCIA_TEMA)).toBe('oscuro');
    });

    it('tocarlo otra vez vuelve al claro', async () => {
      await montar('boton');

      botones()[0].click();
      await fixture.whenStable();
      botones()[0].click();
      await fixture.whenStable();

      expect(tema.tema()).toBe('claro');
      expect(botones()[0].getAttribute('aria-label')).toBe('Activar modo oscuro');
    });

    it('el ícono cambia con el tema: luna para ir al oscuro, sol para volver', async () => {
      await montar('boton');
      expect(trazosDelIcono()).toBe(1);

      botones()[0].click();
      await fixture.whenStable();

      expect(trazosDelIcono()).toBe(2);
    });
  });

  it('usa los colores del tema, sin hexadecimales escritos a mano en las clases', async () => {
    await montar();

    expect(el.innerHTML).not.toMatch(/\[#[0-9a-fA-F]{3,6}\]/);
  });
});
