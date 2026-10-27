import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequisitosPassword } from './requisitos-password';

describe('RequisitosPassword', () => {
  let fixture: ComponentFixture<RequisitosPassword>;
  let el: HTMLElement;

  async function mostrar(entradas: Record<string, unknown>): Promise<void> {
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    await fixture.whenStable();
  }

  const filas = () => Array.from(el.querySelectorAll('li'));
  const fila = (texto: string) => filas().find((li) => li.textContent?.includes(texto))!;
  const encabezado = () => el.querySelector('[role="status"]')!;
  const tramos = () => Array.from(el.querySelectorAll('[aria-hidden="true"] > span'));

  const esRoja = (li: Element) => li.classList.contains('text-rechazado');
  const esVerde = (li: Element) => li.classList.contains('text-aprobado-texto');
  const esGris = (li: Element) => li.classList.contains('text-texto-suave');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RequisitosPassword] }).compileComponents();
    fixture = TestBed.createComponent(RequisitosPassword);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  describe('sin escribir nada', () => {
    it('muestra las cinco reglas, todas en gris y "todavía no"', () => {
      expect(filas().length).toBe(5);
      expect(filas().every(esGris)).toBe(true);
      expect(filas().every((li) => li.textContent?.includes('todavía no'))).toBe(true);
    });

    it('el estado "todavía no" se dibuja con un círculo, distinto del tilde y de la equis', () => {
      expect(filas().every((li) => li.querySelector('svg circle') !== null)).toBe(true);
      expect(filas().some((li) => li.querySelector('svg path') !== null)).toBe(false);
    });

    it('la cuenta es 0/5 aunque la regla del DNI "cumpla por vacío"', () => {
      expect(encabezado().textContent).toContain('0/5');
    });

    it('la barra no se llena', () => {
      expect(tramos().length).toBe(5);
      expect(tramos().every((tramo) => tramo.classList.contains('bg-pista'))).toBe(true);
    });
  });

  describe('mientras se escribe', () => {
    beforeEach(() => mostrar({ password: 'abc' }));

    it('lo que falta va en rojo con "falta" y lo cumplido en verde con "cumplido"', () => {
      expect(esVerde(fila('Una minúscula'))).toBe(true);
      expect(fila('Una minúscula').textContent).toContain('cumplido');

      expect(esRoja(fila('Al menos 8 caracteres'))).toBe(true);
      expect(esRoja(fila('Una mayúscula'))).toBe(true);
      expect(esRoja(fila('Un número'))).toBe(true);
      expect(fila('Un número').textContent).toContain('falta');
    });

    it('cuenta lo cumplido: la minúscula y que no incluya el DNI', () => {
      expect(encabezado().textContent).toContain('2/5');
    });

    it('cada estado tiene su propio ícono, no solo otro color', () => {
      const trazo = (texto: string) => fila(texto).querySelector('svg path')?.getAttribute('d');

      // Cumplido (tilde) y falta (equis) dibujan trazos distintos.
      expect(trazo('Una minúscula')).toBeTruthy();
      expect(trazo('Un número')).toBeTruthy();
      expect(trazo('Una minúscula')).not.toBe(trazo('Un número'));
    });

    it('la barra se llena con dos tramos en rojo (falta mucho)', () => {
      const llenos = tramos().filter((tramo) => tramo.classList.contains('bg-rechazado'));

      expect(llenos.length).toBe(2);
      expect(tramos().length).toBe(5);
    });

    it('con más de la mitad cumplido la barra pasa a amarillo', async () => {
      await mostrar({ password: 'abc12345' });

      // largo, minúscula, número y sin-dni: 4 de 5.
      expect(encabezado().textContent).toContain('4/5');
      expect(tramos().filter((tramo) => tramo.classList.contains('bg-pendiente')).length).toBe(4);
    });
  });

  describe('cuando se cumple todo', () => {
    beforeEach(() => mostrar({ password: 'Clave1234' }));

    it('todo en verde, 5/5 y el encabezado también en verde', () => {
      expect(filas().every(esVerde)).toBe(true);
      expect(encabezado().textContent).toContain('5/5');
      expect(encabezado().classList.contains('text-aprobado-texto')).toBe(true);
    });

    it('la barra se llena entera en verde', () => {
      expect(tramos().every((tramo) => tramo.classList.contains('bg-aprobado'))).toBe(true);
    });
  });

  describe('con el DNI', () => {
    it('una contraseña que lo contiene falla la regla "sin DNI"', async () => {
      await mostrar({ password: 'Clave43880335', dni: '43.880.335' });

      expect(esRoja(fila('Que no incluya el DNI'))).toBe(true);
      expect(encabezado().textContent).toContain('4/5');
    });
  });

  describe('omitir reglas', () => {
    it('no dibuja ni cuenta la regla omitida', async () => {
      await mostrar({ password: 'Clave1234', omitir: ['sin-dni'] });

      expect(filas().length).toBe(4);
      expect(el.textContent).not.toContain('Que no incluya el DNI');
      expect(encabezado().textContent).toContain('4/4');
    });
  });

  describe('resaltarFaltantes', () => {
    it('marca todo en rojo aunque el campo esté vacío, sin tildar nada', async () => {
      await mostrar({ resaltarFaltantes: true });

      expect(filas().every(esRoja)).toBe(true);
      expect(encabezado().textContent).toContain('0/5');
    });

    it('si ya se escribió algo, lo cumplido sigue en verde', async () => {
      await mostrar({ resaltarFaltantes: true, password: 'Clave1234' });

      expect(filas().every(esVerde)).toBe(true);
    });
  });

  describe('accesibilidad', () => {
    it('el encabezado es un aviso `status` y la barra es decorativa', () => {
      expect(encabezado()).not.toBeNull();
      expect(el.querySelector('div[aria-hidden="true"]')).not.toBeNull();
    });

    it('los íconos son decorativos: el estado se lee del texto', () => {
      expect(
        filas().every((li) => li.querySelector('svg')?.getAttribute('aria-hidden') === 'true'),
      ).toBe(true);
    });
  });
});
