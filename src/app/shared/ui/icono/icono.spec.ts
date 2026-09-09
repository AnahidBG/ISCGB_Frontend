import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Icono } from './icono';

describe('Icono', () => {
  let component: Icono;
  let fixture: ComponentFixture<Icono>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Icono],
    }).compileComponents();

    fixture = TestBed.createComponent(Icono);
    fixture.componentRef.setInput('nombre', 'panel');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dibuja un solo <svg> por ícono', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('svg').length).toBe(1);
  });

  // Regresión: sin display propio el `:host` queda en `inline`, y ahí las
  // utilidades `h-5 w-5` de Tailwind no aplican — el SVG colapsa a 0x0 y el
  // ícono desaparece. Pasaba con la hamburguesa, la X del cajón mobile y la
  // campana de `estructura-panel`, todos `<app-icono>` dentro de un <button>
  // que no es flex. Ver docs / el comentario en `icono.ts`.
  describe('dimensionado', () => {
    it('el host lleva un display propio dimensionable (`inline-block`), no queda en `inline`', () => {
      fixture.detectChanges();
      // `h-5 w-5` (Tailwind) se ignora sobre un elemento `display:inline`. El
      // componente tiene que fijar su propio display para funcionar dentro de
      // un <button> que no sea flex.
      expect((fixture.nativeElement as HTMLElement).classList.contains('inline-block')).toBe(true);
    });

    it('el <svg> se dibuja como bloque y llena el alto/ancho del host', () => {
      fixture.detectChanges();
      const svg = fixture.nativeElement.querySelector('svg');
      const estilo = getComputedStyle(svg);
      expect(estilo.display).toBe('block');
      expect(estilo.width).toBe('100%');
      expect(estilo.height).toBe('100%');
    });
  });
});
