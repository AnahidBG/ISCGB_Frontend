import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelBienvenida } from './panel-bienvenida';

describe('PanelBienvenida', () => {
  let component: PanelBienvenida;
  let fixture: ComponentFixture<PanelBienvenida>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelBienvenida],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelBienvenida);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('siempre muestra la marca (logo + "ISCGB")', () => {
    const marca = fixture.nativeElement.querySelector('img[src*="logo-iscgb"]');
    expect(marca).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('ISCGB');
  });

  // En celular el panel verde es solo fondo ambiente: el título y el subtítulo
  // se ocultan (`hidden lg:block`) porque tapaban a la card de login y son
  // redundantes con el "Bienvenido" del formulario. Se ven recién en la
  // versión de 2 columnas (`lg`).
  it('el bloque de título/subtítulo se oculta por defecto y solo aparece en `lg`', () => {
    const titulo = fixture.nativeElement.querySelector('h1');
    expect(titulo).not.toBeNull();
    const bloque = titulo.closest('div');
    expect(bloque.classList.contains('hidden')).toBe(true);
    expect(bloque.classList.contains('lg:block')).toBe(true);
  });

  it('ya no dibuja las etiquetas de áreas ("Gestión de Legajos" / "Revisión Administrativa")', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Gestión de Legajos');
    expect(fixture.nativeElement.textContent).not.toContain('Revisión Administrativa');
  });
});
