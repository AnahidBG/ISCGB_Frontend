import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FiltroSegmentado, OpcionFiltro } from './filtro-segmentado';

const OPCIONES: readonly OpcionFiltro[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'Alumno', etiqueta: 'Alumnos' },
  { valor: 'Docente', etiqueta: 'Docentes' },
];

describe('FiltroSegmentado', () => {
  let fixture: ComponentFixture<FiltroSegmentado>;
  const el = () => fixture.nativeElement as HTMLElement;
  const botones = () => Array.from(el().querySelectorAll('button'));

  async function dibujar(valor: string) {
    fixture.componentRef.setInput('opciones', OPCIONES);
    fixture.componentRef.setInput('valor', valor);
    fixture.componentRef.setInput('etiqueta', 'Filtrar por rol');
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FiltroSegmentado] }).compileComponents();
    fixture = TestBed.createComponent(FiltroSegmentado);
  });

  it('dibuja un botón por opción y marca solo el elegido', async () => {
    await dibujar('Alumno');

    expect(el().querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Filtrar por rol');
    expect(botones().map((boton) => boton.textContent?.trim())).toEqual([
      'Todos',
      'Alumnos',
      'Docentes',
    ]);
    expect(botones().map((boton) => boton.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
    ]);
  });

  it('tocar una opción avisa su valor', async () => {
    const elegida = vi.fn();
    fixture.componentInstance.elegida.subscribe(elegida);
    await dibujar('todos');

    botones()[2].click();

    expect(elegida).toHaveBeenCalledWith('Docente');
  });
});
