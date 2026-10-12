import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogoModal } from './dialogo-modal';

@Component({
  imports: [DialogoModal],
  template: `
    <button id="abrir" type="button" (click)="abierto.set(true)">Abrir</button>
    <button id="del-fondo" type="button">Del fondo</button>

    @if (abierto()) {
      <app-dialogo-modal
        titulo="Registrar parcial"
        subtitulo="Martes 13 de octubre de 2026"
        [bloqueado]="bloqueado()"
        (cerrar)="cierres = cierres + 1; abierto.set(false)"
      >
        <input id="primero" aria-label="Primero" />
        <button id="ultimo" type="button">Guardar</button>
      </app-dialogo-modal>
    }
  `,
})
class Anfitrion {
  readonly abierto = signal(false);
  readonly bloqueado = signal(false);
  cierres = 0;
}

async function montar(): Promise<ComponentFixture<Anfitrion>> {
  const fixture = TestBed.createComponent(Anfitrion);
  await fixture.whenStable();
  return fixture;
}

function buscar<T extends HTMLElement>(selector: string): T {
  return document.querySelector<T>(selector)!;
}

async function abrir(fixture: ComponentFixture<Anfitrion>): Promise<void> {
  buscar('#abrir').focus();
  buscar('#abrir').click();
  await fixture.whenStable();
}

function teclear(elemento: HTMLElement, key: string, shiftKey = false): void {
  elemento.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
}

describe('DialogoModal', () => {
  it('es un diálogo modal con nombre, y se cierra con Escape y con el botón de cerrar', async () => {
    const fixture = await montar();
    await abrir(fixture);

    const dialogo = buscar('[role="dialog"]');
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(
      document.getElementById(dialogo.getAttribute('aria-labelledby')!)?.textContent,
    ).toContain('Registrar parcial');
    expect(dialogo.textContent).toContain('Martes 13 de octubre de 2026');

    teclear(document.body, 'Escape');
    await fixture.whenStable();
    expect(fixture.componentInstance.cierres).toBe(1);

    fixture.componentInstance.abierto.set(true);
    await fixture.whenStable();
    buscar('button[aria-label="Cerrar"]').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.cierres).toBe(2);
  });

  it('bloqueado no se cierra: ni con Escape ni con el botón', async () => {
    const fixture = await montar();
    fixture.componentInstance.bloqueado.set(true);
    await abrir(fixture);

    teclear(document.body, 'Escape');
    buscar('button[aria-label="Cerrar"]').click();
    await fixture.whenStable();

    expect(fixture.componentInstance.cierres).toBe(0);
    expect(buscar<HTMLButtonElement>('button[aria-label="Cerrar"]').disabled).toBe(true);
  });

  it('el foco entra al abrir y vuelve a quien abrió el diálogo al cerrarlo', async () => {
    const fixture = await montar();
    await abrir(fixture);

    expect(document.activeElement).toBe(buscar('[role="dialog"]'));

    teclear(document.body, 'Escape');
    await fixture.whenStable();

    expect(document.activeElement).toBe(buscar('#abrir'));
  });

  it('el foco no se escapa al fondo y el fondo queda inerte mientras está abierto', async () => {
    const fixture = await montar();
    await abrir(fixture);

    expect(buscar('#del-fondo').hasAttribute('inert')).toBe(true);
    expect(buscar('#abrir').hasAttribute('inert')).toBe(true);
    expect(buscar('[role="dialog"]').closest('[inert]')).toBeNull();

    // Tab en el último vuelve al primero (el botón de cerrar); Shift+Tab en el primero, al último.
    buscar('#ultimo').focus();
    teclear(buscar('#ultimo'), 'Tab');
    expect(document.activeElement).toBe(buscar('button[aria-label="Cerrar"]'));

    teclear(buscar('button[aria-label="Cerrar"]'), 'Tab', true);
    expect(document.activeElement).toBe(buscar('#ultimo'));

    teclear(document.body, 'Escape');
    await fixture.whenStable();
    expect(buscar('#del-fondo').hasAttribute('inert')).toBe(false);
    expect(buscar('#abrir').hasAttribute('inert')).toBe(false);
  });
});
