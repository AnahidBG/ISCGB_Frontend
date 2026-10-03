import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  AuthService,
  MENSAJE_ENLACE_INVALIDO,
  MENSAJE_SIN_CONEXION,
} from '../../core/auth/auth.service';
import { routes } from '../../app.routes';
import { CrearPassword } from './crear-password';

const PASSWORD_VALIDA = 'Clave1234';

describe('CrearPassword', () => {
  let fixture: ComponentFixture<CrearPassword>;
  let establecerPassword: ReturnType<typeof vi.fn>;
  let el: HTMLElement;

  async function montar(token: string | null): Promise<void> {
    const params = token === null ? {} : { token };
    await TestBed.configureTestingModule({
      imports: [CrearPassword],
      providers: [
        { provide: AuthService, useValue: { establecerPassword } },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(params)) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CrearPassword);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function escribir(id: string, valor: string): Promise<void> {
    const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function completar(password: string, repetida = password): Promise<void> {
    await escribir('password-nueva', password);
    await escribir('password-repetida', repetida);
  }

  async function enviar(): Promise<void> {
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  const hayFormulario = () => el.querySelector('form') !== null;
  const enlaceALogin = () => el.querySelector('a[href="/login"]');

  beforeEach(() => {
    establecerPassword = vi.fn(() => of(undefined));
  });

  describe('sin token en la URL', () => {
    it('muestra el estado de enlace inválido, sin formulario, con link a /login', async () => {
      await montar(null);

      expect(hayFormulario()).toBe(false);
      expect(el.textContent).toContain(MENSAJE_ENLACE_INVALIDO);
      expect(enlaceALogin()).not.toBeNull();
      expect(establecerPassword).not.toHaveBeenCalled();
    });

    it('un token vacío se trata igual que si faltara', async () => {
      await montar('   ');

      expect(hayFormulario()).toBe(false);
      expect(el.textContent).toContain(MENSAJE_ENLACE_INVALIDO);
    });

    it('el mensaje de enlace inválido es anunciable por lectores de pantalla', async () => {
      await montar(null);

      expect(el.querySelector('[role="alert"]')?.textContent).toContain(MENSAJE_ENLACE_INVALIDO);
    });
  });

  describe('con token', () => {
    beforeEach(() => montar('tok-abc'));

    it('muestra el formulario con dos campos de contraseña nueva', () => {
      expect(hayFormulario()).toBe(true);
      for (const id of ['password-nueva', 'password-repetida']) {
        const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
        expect(input.type).toBe('password');
        expect(input.getAttribute('autocomplete')).toBe('new-password');
      }
    });

    it('la lista de requisitos NO incluye la regla sin-dni, pero sí las demás', () => {
      expect(el.textContent).not.toContain('Que no incluya el DNI');
      expect(el.querySelectorAll('app-requisitos-password li').length).toBe(4);
    });

    it('los requisitos se tildan en vivo mientras se escribe', async () => {
      expect(el.querySelector('app-requisitos-password')!.textContent).toContain('0/4');

      await escribir('password-nueva', PASSWORD_VALIDA);

      expect(el.querySelector('app-requisitos-password')!.textContent).toContain('4/4');
    });

    it('una contraseña que no cumple los requisitos no llama al servicio', async () => {
      await completar('abc');
      await enviar();

      expect(establecerPassword).not.toHaveBeenCalled();
      expect(el.querySelector('[role="alert"]')).not.toBeNull();
    });

    it('si las contraseñas no coinciden no llama al servicio y avisa', async () => {
      await completar(PASSWORD_VALIDA, 'Otra12345');
      await enviar();

      expect(establecerPassword).not.toHaveBeenCalled();
      expect(el.textContent).toContain('Las contraseñas no coinciden');
    });

    it('datos válidos llaman a establecerPassword(token, password) una sola vez', async () => {
      await completar(PASSWORD_VALIDA);
      await enviar();

      expect(establecerPassword).toHaveBeenCalledTimes(1);
      expect(establecerPassword).toHaveBeenCalledWith('tok-abc', PASSWORD_VALIDA);
    });

    it('un segundo envío mientras se está enviando no dispara otra llamada', async () => {
      establecerPassword.mockReturnValue(new Subject<void>());

      await completar(PASSWORD_VALIDA);
      await enviar();
      await enviar();

      expect(establecerPassword).toHaveBeenCalledTimes(1);
    });

    it('éxito: desaparece el formulario y aparece la confirmación con link a /login', async () => {
      await completar(PASSWORD_VALIDA);
      await enviar();

      expect(hayFormulario()).toBe(false);
      expect(el.textContent).toContain('Contraseña creada');
      expect(enlaceALogin()).not.toBeNull();
    });

    it('error de enlace: pasa al estado de enlace inválido, sin formulario', async () => {
      const respuesta = new Subject<void>();
      establecerPassword.mockReturnValue(respuesta);

      await completar(PASSWORD_VALIDA);
      await enviar();
      respuesta.error(new Error(MENSAJE_ENLACE_INVALIDO));
      await fixture.whenStable();

      expect(hayFormulario()).toBe(false);
      expect(el.textContent).toContain(MENSAJE_ENLACE_INVALIDO);
      expect(enlaceALogin()).not.toBeNull();
    });

    it('error de conexión: muestra el mensaje y el formulario sigue con lo escrito', async () => {
      const respuesta = new Subject<void>();
      establecerPassword.mockReturnValue(respuesta);

      await completar(PASSWORD_VALIDA);
      await enviar();
      respuesta.error(new Error(MENSAJE_SIN_CONEXION));
      await fixture.whenStable();

      expect(hayFormulario()).toBe(true);
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(MENSAJE_SIN_CONEXION);
      expect(el.querySelector<HTMLInputElement>('#password-nueva')!.value).toBe(PASSWORD_VALIDA);
      expect(el.querySelector<HTMLInputElement>('#password-repetida')!.value).toBe(PASSWORD_VALIDA);
    });

    it('tras un error de conexión se puede reintentar', async () => {
      establecerPassword.mockReturnValueOnce(throwError(() => new Error(MENSAJE_SIN_CONEXION)));

      await completar(PASSWORD_VALIDA);
      await enviar();
      await enviar();

      expect(establecerPassword).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ruta crear-password', () => {
  const ruta = routes.find((candidata) => candidata.path === 'crear-password');

  it('existe', () => {
    expect(ruta).toBeDefined();
  });

  it('es pública: no lleva canActivate (se llega sin sesión)', () => {
    expect(ruta?.canActivate).toBeUndefined();
  });
});
