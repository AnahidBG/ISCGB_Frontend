import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject, of, throwError } from 'rxjs';
import {
  AuthService,
  MENSAJE_ENLACE_RECUPERACION_INVALIDO,
  MENSAJE_ERROR_CREAR_PASSWORD,
  MENSAJE_SIN_CONEXION,
} from '../../core/auth/auth.service';
import { routes } from '../../app.routes';
import { ESPERA_REDIRECCION_MS, RestablecerPassword } from './restablecer-password';

const PASSWORD_VALIDA = 'Clave1234';

@Component({ template: '' })
class PantallaVacia {}

describe('RestablecerPassword', () => {
  let restablecerPassword: ReturnType<typeof vi.fn>;
  let harness: RouterTestingHarness;
  let el: HTMLElement;

  async function abrir(url: string): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { restablecerPassword } },
        provideRouter([
          { path: 'restablecer-password', component: RestablecerPassword },
          { path: 'login', component: PantallaVacia },
          { path: 'recuperar-contrasena', component: PantallaVacia },
        ]),
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, RestablecerPassword);
    el = harness.routeNativeElement!;
    await harness.fixture.whenStable();
  }

  async function escribir(id: string, valor: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  async function completar(password: string, repetida = password): Promise<void> {
    await escribir('password', password);
    await escribir('confirmPassword', repetida);
  }

  async function enviar(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await harness.fixture.whenStable();
  }

  const hayFormulario = () => el.querySelector('form') !== null;

  beforeEach(() => {
    restablecerPassword = vi.fn(() => of(undefined));
  });

  afterEach(() => vi.useRealTimers());

  describe('sin token en la URL', () => {
    it('muestra "Enlace no válido", sin formulario, con el camino para pedir otro', async () => {
      await abrir('/restablecer-password');

      expect(hayFormulario()).toBe(false);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(
        MENSAJE_ENLACE_RECUPERACION_INVALIDO,
      );
      expect(el.querySelector('a[href="/recuperar-contrasena"]')).not.toBeNull();
      expect(el.querySelector('a[href="/login"]')).not.toBeNull();
      expect(restablecerPassword).not.toHaveBeenCalled();
    });

    it('un token de puros espacios se trata igual que si faltara', async () => {
      await abrir('/restablecer-password?token=%20%20');

      expect(hayFormulario()).toBe(false);
    });
  });

  describe('con token', () => {
    beforeEach(() => abrir('/restablecer-password?token=tok-abc'));

    it('muestra el diseño de Gonza: título, dos campos de contraseña y el botón', () => {
      expect(el.querySelector('h1')?.textContent).toContain('Nueva contraseña');
      for (const id of ['password', 'confirmPassword']) {
        const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
        expect(input.type).toBe('password');
        expect(input.getAttribute('autocomplete')).toBe('new-password');
      }
      expect(el.querySelector('button[type="submit"]')?.textContent).toContain(
        'Restablecer contraseña',
      );
    });

    it('la lista de requisitos no incluye "sin-dni" y se tilda en vivo', async () => {
      const requisitos = () => el.querySelector('app-requisitos-password')!;
      expect(requisitos().textContent).not.toContain('Que no incluya el DNI');
      expect(requisitos().textContent).toContain('0/4');

      await escribir('password', PASSWORD_VALIDA);

      expect(requisitos().textContent).toContain('4/4');
    });

    describe('requisitos de la contraseña', () => {
      const filas = () => Array.from(el.querySelectorAll('app-requisitos-password li'));
      const fila = (texto: string) => filas().find((li) => li.textContent?.includes(texto))!;

      it('antes de escribir no reta: todo en gris, nada en rojo', () => {
        expect(filas().every((li) => li.classList.contains('text-texto-suave'))).toBe(true);
      });

      it('al escribir, lo que falta va en rojo y lo cumplido en verde', async () => {
        await escribir('password', 'abc');

        expect(fila('Una minúscula').classList.contains('text-aprobado-texto')).toBe(true);
        expect(fila('Un número').classList.contains('text-rechazado')).toBe(true);
      });

      it('enviar vacío marca en rojo toda la lista', async () => {
        await enviar();

        expect(filas().every((li) => li.classList.contains('text-rechazado'))).toBe(true);
      });
    });

    describe('ojito para ver la contraseña', () => {
      const ojitos = () => el.querySelectorAll<HTMLButtonElement>('app-campo-contrasena button');
      const campo = (id: string) => el.querySelector<HTMLInputElement>(`#${id}`)!;

      it('cada campo tiene el suyo y mostrar uno no destapa el otro', async () => {
        expect(ojitos().length).toBe(2);

        ojitos()[0].click();
        await harness.fixture.whenStable();

        expect(campo('password').type).toBe('text');
        expect(campo('confirmPassword').type).toBe('password');
      });

      it('verla no la borra ni la cambia', async () => {
        await escribir('password', PASSWORD_VALIDA);

        ojitos()[0].click();
        await harness.fixture.whenStable();

        expect(campo('password').value).toBe(PASSWORD_VALIDA);
        expect(campo('password').getAttribute('aria-describedby')).toBeNull();
      });
    });

    it('confirma con una tilde cuando las dos contraseñas coinciden', async () => {
      expect(el.textContent).not.toContain('Las contraseñas coinciden');

      await completar(PASSWORD_VALIDA);
      expect(el.textContent).toContain('Las contraseñas coinciden');

      await escribir('confirmPassword', 'Otra12345');
      expect(el.textContent).not.toContain('Las contraseñas coinciden');
      expect(el.textContent).toContain('Las contraseñas no coinciden.');
    });

    it('un campo con error apunta a su mensaje con aria-describedby', async () => {
      await enviar();

      for (const id of ['password', 'confirmPassword']) {
        expect(el.querySelector(`#${id}`)!.getAttribute('aria-describedby')).toBe(`${id}-error`);
        expect(el.querySelector(`#${id}-error`)).not.toBeNull();
      }
    });

    it('enviar vacío no llama al servicio y marca los dos campos', async () => {
      await enviar();

      expect(restablecerPassword).not.toHaveBeenCalled();
      expect(el.textContent).toContain('Ingresá una contraseña nueva.');
      expect(el.textContent).toContain('Repetí la contraseña nueva.');
    });

    it('una contraseña que no cumple la política no llama al servicio', async () => {
      await completar('abc');
      await enviar();

      expect(restablecerPassword).not.toHaveBeenCalled();
      expect(el.textContent).toContain('La contraseña todavía no cumple todos los requisitos.');
      expect(el.querySelector('#password')!.getAttribute('aria-invalid')).toBe('true');
    });

    it('si las contraseñas no coinciden no llama al servicio y avisa', async () => {
      await completar(PASSWORD_VALIDA, 'Otra12345');
      await enviar();

      expect(restablecerPassword).not.toHaveBeenCalled();
      expect(el.textContent).toContain('Las contraseñas no coinciden.');
    });

    it('datos válidos llaman a restablecerPassword(token, password) una sola vez', async () => {
      await completar(PASSWORD_VALIDA);
      await enviar();

      expect(restablecerPassword).toHaveBeenCalledTimes(1);
      expect(restablecerPassword).toHaveBeenCalledWith('tok-abc', PASSWORD_VALIDA);
    });

    it('un segundo envío mientras se guarda no dispara otra llamada (el token es de un uso)', async () => {
      restablecerPassword.mockReturnValue(new Subject<void>());

      await completar(PASSWORD_VALIDA);
      await enviar();
      await enviar();

      expect(restablecerPassword).toHaveBeenCalledTimes(1);
    });

    it('éxito: muestra la confirmación y un enlace para ir al login ya', async () => {
      await completar(PASSWORD_VALIDA);
      await enviar();

      expect(hayFormulario()).toBe(false);
      expect(el.querySelector('[role="status"]')?.textContent).toContain('Ya podés iniciar sesión');
      expect(el.querySelector('a[href="/login"]')).not.toBeNull();
    });

    it('éxito: lleva al login después de la espera', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await completar(PASSWORD_VALIDA);

      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      el.querySelector('form')!.dispatchEvent(new Event('submit'));

      vi.advanceTimersByTime(ESPERA_REDIRECCION_MS - 1);
      expect(navigate).not.toHaveBeenCalledWith(['/login']);

      vi.advanceTimersByTime(1);
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('enlace rechazado por el backend: pasa a "Enlace no válido"', async () => {
      restablecerPassword.mockReturnValue(
        throwError(() => new Error(MENSAJE_ENLACE_RECUPERACION_INVALIDO)),
      );

      await completar(PASSWORD_VALIDA);
      await enviar();

      expect(hayFormulario()).toBe(false);
      expect(el.textContent).toContain('Enlace no válido');
      expect(el.querySelector('a[href="/recuperar-contrasena"]')).not.toBeNull();
    });

    it.each([MENSAJE_SIN_CONEXION, MENSAJE_ERROR_CREAR_PASSWORD])(
      'si falla con "%s" lo muestra y conserva lo escrito para reintentar',
      async (mensaje) => {
        restablecerPassword.mockReturnValueOnce(throwError(() => new Error(mensaje)));

        await completar(PASSWORD_VALIDA);
        await enviar();

        expect(hayFormulario()).toBe(true);
        expect(el.querySelector('[role="alert"]')?.textContent).toContain(mensaje);
        expect(el.querySelector<HTMLInputElement>('#password')!.value).toBe(PASSWORD_VALIDA);

        await enviar();
        expect(restablecerPassword).toHaveBeenCalledTimes(2);
      },
    );
  });
});

describe('ruta restablecer-password', () => {
  const ruta = routes.find((candidata) => candidata.path === 'restablecer-password');

  it('existe con el nombre del enlace que arma el backend', () => {
    expect(ruta).toBeDefined();
  });

  it('es pública: se llega desde el mail, sin sesión', () => {
    expect(ruta?.canActivate).toBeUndefined();
  });

  it('carga el componente de forma diferida (no lo importa app.routes)', async () => {
    expect(ruta?.loadComponent).toBeDefined();
    expect(await ruta!.loadComponent!()).toBe(RestablecerPassword);
  });
});
