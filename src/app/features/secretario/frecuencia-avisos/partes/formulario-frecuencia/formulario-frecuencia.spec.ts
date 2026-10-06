import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioFrecuencia } from './formulario-frecuencia';

describe('FormularioFrecuencia (SCRUM-151)', () => {
  let fixture: ComponentFixture<FormularioFrecuencia>;
  let guardados: number[];
  const el = () => fixture.nativeElement as HTMLElement;
  const campo = () => el().querySelector<HTMLInputElement>('#dias-frecuencia')!;

  async function dibujar(entradas: Record<string, unknown> = {}) {
    fixture.componentRef.setInput('diasActuales', 7);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    await fixture.whenStable();
  }

  async function guardarCon(valor: string) {
    campo().value = valor;
    campo().dispatchEvent(new Event('input'));
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FormularioFrecuencia] }).compileComponents();
    fixture = TestBed.createComponent(FormularioFrecuencia);
    guardados = [];
    fixture.componentInstance.guardar.subscribe((dias) => guardados.push(dias));
  });

  it('arranca con la frecuencia vigente y aclara que el servidor revisa una vez por día', async () => {
    await dibujar();

    expect(campo().value).toBe('7');
    expect(el().textContent).toContain('cada 7 días');
    expect(el().textContent).toContain('una vez por día');
  });

  it('con un valor que no es un entero de 1 día o más, dice por qué y no avisa al contenedor', async () => {
    await dibujar();

    await guardarCon('0');

    expect(el().querySelector('#dias-frecuencia-error')?.textContent).toContain('al menos 1 día');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
    expect(guardados).toEqual([]);
  });

  it('con un valor válido avisa al contenedor con el número', async () => {
    await dibujar();

    await guardarCon('14');

    expect(guardados).toEqual([14]);
  });

  it('muestra el aviso de guardado y el error del servidor que le pasa el contenedor', async () => {
    await dibujar({
      confirmacion: 'Listo: los avisos se van a enviar cada 14 días.',
      errorServidor: 'La frecuencia debe ser mayor a 0 días.',
    });

    expect(el().querySelector('[role="status"]')?.textContent).toContain('cada 14 días');
    expect(el().querySelector('form > [role="alert"]')?.textContent).toContain(
      'La frecuencia debe ser mayor a 0 días.',
    );
  });
});
