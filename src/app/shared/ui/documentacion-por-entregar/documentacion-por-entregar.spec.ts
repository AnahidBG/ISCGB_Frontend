import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { DocumentoRequerido } from '../../../core/legajos/modelos/documento-requerido';
import { DocumentacionPorEntregar } from './documentacion-por-entregar';

/** Cualquier URL existe: los tests tocan enlaces reales y no quieren un NG04002. */
const RUTAS_DE_PRUEBA: Routes = [{ path: '**', children: [] }];

function requerido(idTipoDoc: number, nombreDocumento: string): DocumentoRequerido {
  return { idTipoDoc, nombreDocumento, obligatorio: true, anual: false };
}

describe('DocumentacionPorEntregar', () => {
  let fixture: ComponentFixture<DocumentacionPorEntregar>;
  const el = () => fixture.nativeElement as HTMLElement;

  async function dibujar(documentos: DocumentoRequerido[]) {
    fixture.componentRef.setInput('documentos', documentos);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentacionPorEntregar],
      providers: [provideRouter(RUTAS_DE_PRUEBA)],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentacionPorEntregar);
  });

  it('es una sección con nombre, para que el lector de pantalla la anuncie', async () => {
    await dibujar([requerido(1, 'DNI')]);

    const seccion = el().querySelector('section')!;
    const titulo = el().querySelector(`#${seccion.getAttribute('aria-labelledby')}`);
    expect(titulo?.textContent?.trim()).toBe('Documentación por entregar');
  });

  it('lista cada documento que falta y cuántos son', async () => {
    await dibujar([requerido(1, 'DNI'), requerido(2, 'Título secundario'), requerido(3, 'CUIL')]);

    const nombres = Array.from(el().querySelectorAll('li')).map((li) =>
      li.querySelector('span')?.textContent?.trim(),
    );
    expect(nombres).toEqual(['DNI', 'Título secundario', 'CUIL']);
    expect(el().querySelector('header')?.textContent).toContain('3');
  });

  it('cada documento abre Subir Documento con su tipo elegido y un nombre accesible propio', async () => {
    await dibujar([requerido(1, 'DNI'), requerido(2, 'CUIL')]);

    const enlaces = Array.from(el().querySelectorAll<HTMLAnchorElement>('li a'));
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/legajo/subir-documento?tipo=1',
      '/legajo/subir-documento?tipo=2',
    ]);
    // Sin esto el lector de pantalla lee "Subir, Subir": no se sabe cuál es cuál.
    expect(enlaces.map((a) => a.getAttribute('aria-label'))).toEqual(['Subir DNI', 'Subir CUIL']);
  });

  it('con uno solo, la indicación va en singular', async () => {
    await dibujar([requerido(1, 'DNI')]);

    expect(el().textContent).toContain(
      'Cargalo desde Subir Documento y entregalo en papel en Secretaría.',
    );
  });

  it('con varios, la indicación va en plural', async () => {
    await dibujar([requerido(1, 'DNI'), requerido(2, 'CUIL')]);

    expect(el().textContent).toContain(
      'Cargalos desde Subir Documento y entregalos en papel en Secretaría.',
    );
  });
});
