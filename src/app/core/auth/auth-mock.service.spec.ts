import { TestBed } from '@angular/core/testing';
import { AuthMockService } from './auth-mock.service';
import { MENSAJE_ENLACE_RECUPERACION_INVALIDO } from './auth.service';

/**
 * El mock tiene que portarse como el backend en lo que la pantalla puede ver:
 * si no, una pantalla que anda contra el mock se rompe contra la API real.
 */
describe('AuthMockService: recupero de contraseña', () => {
  let servicio: AuthMockService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [AuthMockService] });
    servicio = TestBed.inject(AuthMockService);
  });

  afterEach(() => vi.useRealTimers());

  it('solicitarRecuperacion completa con cualquier DNI, como el backend', () => {
    const completos: string[] = [];
    for (const dni of ['12345678', '99999999']) {
      servicio.solicitarRecuperacion(dni).subscribe({ complete: () => completos.push(dni) });
    }

    vi.runAllTimers();

    expect(completos).toEqual(['12345678', '99999999']);
  });

  it('restablecerPassword con el token centinela "invalido" simula un enlace vencido', () => {
    let error: string | null = null;
    servicio.restablecerPassword('invalido', 'Clave1234').subscribe({
      error: (fallo: Error) => (error = fallo.message),
    });

    vi.runAllTimers();

    expect(error).toBe(MENSAJE_ENLACE_RECUPERACION_INVALIDO);
  });

  it('restablecerPassword con cualquier otro token completa', () => {
    let completo = false;
    servicio.restablecerPassword('tok-abc', 'Clave1234').subscribe({
      complete: () => (completo = true),
    });

    vi.runAllTimers();

    expect(completo).toBe(true);
  });
});
