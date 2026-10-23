import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import {
  AuthService,
  MENSAJE_ERROR_RECUPERACION,
  MENSAJE_SIN_CONEXION,
} from '../../core/auth/auth.service';
import { routes } from '../../app.routes';
import { MENSAJE_DNI_INVALIDO, RecuperarContrasena } from './recuperar-contrasena';

describe('RecuperarContrasena', () => {
  let fixture: ComponentFixture<RecuperarContrasena>;
  let solicitarRecuperacion: ReturnType<typeof vi.fn>;
  let el: HTMLElement;

  beforeEach(async () => {
    solicitarRecuperacion = vi.fn(() => of(undefined));

    await TestBed.configureTestingModule({
      imports: [RecuperarContrasena],
      providers: [{ provide: AuthService, useValue: { solicitarRecuperacion } }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecuperarContrasena);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function escribirDni(valor: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>('#dni-recuperacion')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function enviar(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const hayFormulario = () => el.querySelector('form') !== null;

  it('muestra el formulario con el campo DNI y un enlace para volver al login', () => {
    expect(hayFormulario()).toBe(true);
    expect(el.querySelector('#dni-recuperacion')).not.toBeNull();
    expect(el.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('ya no muestra el aviso de "pantalla provisoria"', () => {
    expect(el.textContent).not.toContain('provisoria');
  });

  it.each([
    ['vacío', ''],
    ['con menos de 7 números', '12345'],
    ['con letras', 'abc'],
  ])('un DNI %s no llama al servicio y avisa', async (_caso, dni) => {
    await escribirDni(dni);
    await enviar();

    expect(solicitarRecuperacion).not.toHaveBeenCalled();
    expect(el.textContent).toContain(MENSAJE_DNI_INVALIDO);
    expect(el.querySelector('#dni-recuperacion')!.getAttribute('aria-describedby')).toBe(
      'dni-recuperacion-error',
    );
  });

  it('manda el DNI limpio, sin puntos ni espacios, una sola vez', async () => {
    await escribirDni(' 12.345.678 ');
    await enviar();

    expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);
    expect(solicitarRecuperacion).toHaveBeenCalledWith('12345678');
  });

  it('éxito: muestra "Revisá tu correo" sin decir si el DNI existe', async () => {
    await escribirDni('12345678');
    await enviar();

    expect(hayFormulario()).toBe(false);
    expect(el.textContent).toContain('Revisá tu correo');
    expect(el.textContent).toContain('Si el DNI está registrado');
    expect(el.textContent).toMatch(/vence en 1\s+hora/);
  });

  it('"Enviar de nuevo" vuelve al formulario con el DNI que ya estaba escrito', async () => {
    await escribirDni('12345678');
    await enviar();

    const botones = Array.from(el.querySelectorAll('button'));
    botones.find((boton) => boton.textContent?.includes('Enviar de nuevo'))!.click();
    await fixture.whenStable();

    expect(hayFormulario()).toBe(true);
    expect(el.querySelector<HTMLInputElement>('#dni-recuperacion')!.value).toBe('12345678');
  });

  it('un segundo envío mientras el primero no terminó no dispara otra llamada', async () => {
    solicitarRecuperacion.mockReturnValue(new Subject<void>());

    await escribirDni('12345678');
    await enviar();
    await enviar();

    expect(solicitarRecuperacion).toHaveBeenCalledTimes(1);
  });

  it.each([MENSAJE_SIN_CONEXION, MENSAJE_ERROR_RECUPERACION])(
    'si falla con "%s" lo muestra y conserva el DNI para reintentar',
    async (mensaje) => {
      solicitarRecuperacion.mockReturnValueOnce(throwError(() => new Error(mensaje)));

      await escribirDni('12345678');
      await enviar();

      expect(hayFormulario()).toBe(true);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(mensaje);
      expect(el.querySelector<HTMLInputElement>('#dni-recuperacion')!.value).toBe('12345678');

      await enviar();
      expect(solicitarRecuperacion).toHaveBeenCalledTimes(2);
    },
  );
});

describe('ruta recuperar-contrasena', () => {
  const ruta = routes.find((candidata) => candidata.path === 'recuperar-contrasena');

  it('es pública: se llega sin sesión', () => {
    expect(ruta).toBeDefined();
    expect(ruta?.canActivate).toBeUndefined();
  });
});
