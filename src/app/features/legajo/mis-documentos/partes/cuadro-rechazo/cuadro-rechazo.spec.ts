import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MOTIVOS_RECHAZO } from '../../../../../core/legajos/motivos-rechazo';
import { CuadroRechazo } from './cuadro-rechazo';

describe('CuadroRechazo', () => {
  let fixture: ComponentFixture<CuadroRechazo>;
  let confirmados: string[];
  let cancelaciones: number;

  beforeEach(async () => {
    confirmados = [];
    cancelaciones = 0;
    fixture = TestBed.createComponent(CuadroRechazo);
    fixture.componentRef.setInput('prefijoId', 'rechazo-101');
    fixture.componentInstance.confirmar.subscribe((comentario) => confirmados.push(comentario));
    fixture.componentInstance.cancelar.subscribe(() => (cancelaciones += 1));
    await fixture.whenStable();
  });

  const raiz = () => fixture.nativeElement as HTMLElement;

  function casillas(): HTMLInputElement[] {
    return Array.from(raiz().querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
  }

  function etiquetaDe(casilla: HTMLInputElement): string {
    return casilla.closest('label')?.textContent?.trim() ?? '';
  }

  async function marcar(motivo: string): Promise<void> {
    casillas().find((c) => etiquetaDe(c) === motivo)!.click();
    await fixture.whenStable();
  }

  async function escribirAclaracion(texto: string): Promise<void> {
    const campo = raiz().querySelector<HTMLTextAreaElement>('#rechazo-101-aclaracion')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function apretar(etiqueta: string): Promise<void> {
    Array.from(raiz().querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === etiqueta)!
      .click();
    await fixture.whenStable();
  }

  it('muestra los 7 motivos como casillas, en el orden de la institución', () => {
    expect(casillas().map(etiquetaDe)).toEqual([...MOTIVOS_RECHAZO]);
    expect(casillas().every((c) => !c.checked)).toBe(true);
  });

  it('la aclaración es opcional y se identifica como tal', () => {
    const etiqueta = raiz().querySelector('label[for="rechazo-101-aclaracion"]');
    expect(etiqueta?.textContent).toContain('Aclaración (opcional)');
  });

  it('sin ningún motivo marcado no confirma: muestra el error y no envía nada', async () => {
    await escribirAclaracion('falta la hoja 2');
    await apretar('Confirmar rechazo');

    expect(confirmados).toEqual([]);
    expect(raiz().querySelector('[role="alert"]')?.textContent).toContain('Marcá al menos un motivo');
  });

  it('el error se va apenas se marca un motivo', async () => {
    await apretar('Confirmar rechazo');
    await marcar('Documento incompleto');

    expect(raiz().querySelector('[role="alert"]')).toBeNull();
  });

  it('envía los motivos marcados y la aclaración, armados como comentario', async () => {
    await marcar('Documento incompleto');
    await marcar('Falta sello y/o firma');
    await escribirAclaracion('falta la hoja 2');
    await apretar('Confirmar rechazo');

    expect(confirmados).toEqual(['Falta sello y/o firma; Documento incompleto. Aclaración: falta la hoja 2']);
  });

  it('desmarcar una casilla saca ese motivo', async () => {
    await marcar('Documento incompleto');
    await marcar('Falta sello y/o firma');
    await marcar('Documento incompleto');
    await apretar('Confirmar rechazo');

    expect(confirmados).toEqual(['Falta sello y/o firma']);
  });

  it('"Cancelar" avisa sin enviar nada', async () => {
    await marcar('Documento incompleto');
    await apretar('Cancelar');

    expect(cancelaciones).toBe(1);
    expect(confirmados).toEqual([]);
  });
});
