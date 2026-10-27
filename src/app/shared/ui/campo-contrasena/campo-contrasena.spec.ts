import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CampoContrasena } from './campo-contrasena';

/** La pantalla que usa el campo con formularios reactivos, como restablecer-password. */
@Component({
  imports: [CampoContrasena, ReactiveFormsModule],
  template: `
    <app-campo-contrasena
      idCampo="clave"
      autocomplete="new-password"
      placeholder="••••"
      [invalido]="invalido()"
      [formControl]="control"
    />
  `,
})
class AnfitrionReactivo {
  readonly control = new FormControl('', { nonNullable: true });
  readonly invalido = signal(false);
}

/** La pantalla que usa el campo con signals, como crear-password. */
@Component({
  imports: [CampoContrasena],
  template: `
    <app-campo-contrasena
      idCampo="clave"
      [conCandado]="true"
      [valor]="texto()"
      (valorChange)="texto.set($event)"
    />
  `,
})
class AnfitrionConSignals {
  readonly texto = signal('inicial');
}

function entrada(el: HTMLElement): HTMLInputElement {
  return el.querySelector<HTMLInputElement>('input')!;
}

function ojito(el: HTMLElement): HTMLButtonElement {
  return el.querySelector<HTMLButtonElement>('button')!;
}

/** El candado es el único `<svg>` hijo directo; el del ojito vive adentro del botón. */
function candado(el: HTMLElement): SVGElement | null {
  return el.querySelector<SVGElement>('span.relative > svg');
}

describe('CampoContrasena', () => {
  describe('con formularios reactivos', () => {
    let fixture: ComponentFixture<AnfitrionReactivo>;
    let el: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [AnfitrionReactivo] }).compileComponents();
      fixture = TestBed.createComponent(AnfitrionReactivo);
      el = fixture.nativeElement;
      await fixture.whenStable();
    });

    it('arranca con la contraseña oculta y el ojito listo para mostrarla', () => {
      expect(entrada(el).type).toBe('password');
      expect(ojito(el).getAttribute('aria-label')).toBe('Mostrar la contraseña');
      expect(ojito(el).getAttribute('aria-pressed')).toBe('false');
    });

    it('el input lleva el id que le toca a la etiqueta, el autocomplete y el placeholder', () => {
      expect(entrada(el).id).toBe('clave');
      expect(entrada(el).getAttribute('autocomplete')).toBe('new-password');
      expect(entrada(el).getAttribute('placeholder')).toBe('••••');
    });

    it('el ojito muestra la contraseña y otro toque la vuelve a ocultar', async () => {
      ojito(el).click();
      await fixture.whenStable();

      expect(entrada(el).type).toBe('text');
      expect(ojito(el).getAttribute('aria-label')).toBe('Ocultar la contraseña');
      expect(ojito(el).getAttribute('aria-pressed')).toBe('true');

      ojito(el).click();
      await fixture.whenStable();

      expect(entrada(el).type).toBe('password');
      expect(ojito(el).getAttribute('aria-label')).toBe('Mostrar la contraseña');
    });

    it('el ícono acompaña a la acción: ojo para mostrar, ojo tachado para ocultar', async () => {
      const trazos = () => ojito(el).querySelectorAll('svg > *').length;

      // Ojo abierto: contorno y pupila.
      expect(trazos()).toBe(2);

      ojito(el).click();
      await fixture.whenStable();

      // Ojo tachado: contorno, pupila y la barra.
      expect(trazos()).toBe(3);
    });

    it('el ojito es un botón que no envía el formulario y apunta al campo', () => {
      expect(ojito(el).type).toBe('button');
      expect(ojito(el).getAttribute('aria-controls')).toBe('clave');
    });

    it('apretar el ojito con el mouse no le saca el foco al campo', () => {
      const evento = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      ojito(el).dispatchEvent(evento);

      expect(evento.defaultPrevented).toBe(true);
    });

    it('mostrar la contraseña no cambia lo escrito', async () => {
      entrada(el).value = 'Clave1234';
      entrada(el).dispatchEvent(new Event('input'));
      ojito(el).click();
      await fixture.whenStable();

      expect(entrada(el).value).toBe('Clave1234');
      expect(fixture.componentInstance.control.value).toBe('Clave1234');
    });

    it('lo que se escribe llega al FormControl', async () => {
      entrada(el).value = 'abc';
      entrada(el).dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(fixture.componentInstance.control.value).toBe('abc');
    });

    it('lo que le pone el FormControl aparece en el campo', async () => {
      fixture.componentInstance.control.setValue('desde-afuera');
      await fixture.whenStable();

      expect(entrada(el).value).toBe('desde-afuera');
    });

    it('al salir del campo, el control queda como tocado', async () => {
      expect(fixture.componentInstance.control.touched).toBe(false);

      entrada(el).dispatchEvent(new Event('blur'));
      await fixture.whenStable();

      expect(fixture.componentInstance.control.touched).toBe(true);
    });

    it('si el control se deshabilita, se deshabilitan el campo y el ojito', async () => {
      fixture.componentInstance.control.disable();
      await fixture.whenStable();

      expect(entrada(el).disabled).toBe(true);
      expect(ojito(el).disabled).toBe(true);
    });

    it('sin error el campo no está marcado y no apunta a ningún mensaje', () => {
      expect(entrada(el).getAttribute('aria-invalid')).toBe('false');
      expect(entrada(el).hasAttribute('aria-describedby')).toBe(false);
      expect(entrada(el).classList.contains('border-borde')).toBe(true);
      expect(entrada(el).classList.contains('border-rechazado')).toBe(false);
    });

    it('con error: borde rojo, aria-invalid y apunta al mensaje <id>-error', async () => {
      fixture.componentInstance.invalido.set(true);
      await fixture.whenStable();

      expect(entrada(el).getAttribute('aria-invalid')).toBe('true');
      expect(entrada(el).getAttribute('aria-describedby')).toBe('clave-error');
      expect(entrada(el).classList.contains('border-rechazado')).toBe(true);
      expect(entrada(el).classList.contains('border-borde')).toBe(false);
    });

    it('sin candado, el texto arranca a la izquierda (pl-4)', () => {
      expect(entrada(el).classList.contains('pl-4')).toBe(true);
      expect(candado(el)).toBeNull();
    });
  });

  describe('con signals (valor como model)', () => {
    let fixture: ComponentFixture<AnfitrionConSignals>;
    let el: HTMLElement;

    beforeEach(async () => {
      await TestBed.configureTestingModule({ imports: [AnfitrionConSignals] }).compileComponents();
      fixture = TestBed.createComponent(AnfitrionConSignals);
      el = fixture.nativeElement;
      await fixture.whenStable();
    });

    it('muestra el valor que le pasa la pantalla', () => {
      expect(entrada(el).value).toBe('inicial');
    });

    it('avisa a la pantalla lo que se escribe', async () => {
      entrada(el).value = 'nueva';
      entrada(el).dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(fixture.componentInstance.texto()).toBe('nueva');
    });

    it('con candado dibuja el ícono y deja lugar a la izquierda (pl-11)', () => {
      expect(candado(el)).not.toBeNull();
      expect(entrada(el).classList.contains('pl-11')).toBe(true);
    });
  });
});
