import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AvisoLegajoCompleto } from './aviso-legajo-completo';

describe('AvisoLegajoCompleto', () => {
  let fixture: ComponentFixture<AvisoLegajoCompleto>;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AvisoLegajoCompleto] }).compileComponents();
    fixture = TestBed.createComponent(AvisoLegajoCompleto);
    await fixture.whenStable();
  });

  it('avisa que el legajo está completo', () => {
    expect(el().querySelector('strong')?.textContent?.trim()).toBe('¡Tu legajo está completo!');
    expect(el().textContent).toContain('toda la documentación obligatoria');
  });

  it('se anuncia como estado, sin interrumpir a quien usa lector de pantalla', () => {
    expect(el().querySelector('[role="status"]')).not.toBeNull();
    expect(el().querySelector('[role="alert"]')).toBeNull();
  });

  it('usa el estilo de aprobado del sistema: borde, fondo e ícono', () => {
    const cartel = el().querySelector('[role="status"]')!;

    expect(cartel.classList).toContain('border-aprobado/30');
    expect(cartel.classList).toContain('bg-aprobado/10');
    expect(el().querySelector('app-icono')?.classList).toContain('text-aprobado');
  });

  it('el texto no va en el verde de estado: sobre ese fondo no llega a contraste AA', () => {
    const conVerde = Array.from(el().querySelectorAll('p, span, strong')).filter((nodo) =>
      nodo.classList.contains('text-aprobado'),
    );

    expect(conVerde).toEqual([]);
  });
});
