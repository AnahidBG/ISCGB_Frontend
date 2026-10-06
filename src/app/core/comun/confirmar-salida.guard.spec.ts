import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ConCambiosSinEnviar, confirmarSalidaGuard } from './confirmar-salida.guard';

function ejecutarGuard(componente: ConCambiosSinEnviar) {
  return TestBed.runInInjectionContext(() =>
    confirmarSalidaGuard(
      componente,
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  );
}

describe('confirmarSalidaGuard', () => {
  it('deja salir si la pantalla no tiene nada sin enviar', () => {
    expect(ejecutarGuard({ confirmarSalida: () => true })).toBe(true);
  });

  it('la decisión es de la pantalla: si pregunta, espera su respuesta', async () => {
    const resultado = ejecutarGuard({ confirmarSalida: () => Promise.resolve(false) });

    await expect(resultado).resolves.toBe(false);
  });
});
