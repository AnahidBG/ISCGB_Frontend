import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Routes, provideRouter } from '@angular/router';
import { RechazoVigente } from '../../../core/legajos/rechazos-legajo';
import { DocumentosRechazados } from './documentos-rechazados';

/** Cualquier URL existe: los tests leen enlaces reales y no quieren un NG04002. */
const RUTAS_DE_PRUEBA: Routes = [{ path: '**', children: [] }];

function rechazo(id: number, nombre: string, motivo: string, idTipoDoc: number | null): RechazoVigente {
  return {
    documento: {
      id,
      nombre,
      estado: 'Rechazado',
      fechaSubida: new Date('2026-10-01T10:00:00'),
      comentario: motivo,
      fechaVencimiento: null,
      presentadoFisico: false,
    },
    motivo,
    tipo:
      idTipoDoc === null
        ? null
        : { idTipoDoc, nombreDocumento: nombre, obligatorio: true, anual: false },
  };
}

describe('DocumentosRechazados (SCRUM-152)', () => {
  let fixture: ComponentFixture<DocumentosRechazados>;
  const el = () => fixture.nativeElement as HTMLElement;

  async function dibujar(rechazos: RechazoVigente[]) {
    fixture.componentRef.setInput('rechazos', rechazos);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentosRechazados],
      providers: [provideRouter(RUTAS_DE_PRUEBA)],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentosRechazados);
  });

  it('es una sección con nombre, para que el lector de pantalla la anuncie', async () => {
    await dibujar([rechazo(1, 'DNI', 'Documento incompleto', 1)]);

    const seccion = el().querySelector('section')!;
    const titulo = el().querySelector(`#${seccion.getAttribute('aria-labelledby')}`);
    expect(titulo?.textContent?.trim()).toBe('Documentación rechazada');
  });

  it('muestra cada documento rechazado con su motivo, y cuántos son', async () => {
    await dibujar([
      rechazo(1, 'DNI', 'Documento incompleto', 1),
      rechazo(2, 'Título', 'Falta sello y/o firma', 2),
    ]);

    const filas = Array.from(el().querySelectorAll('li')).map((li) => li.textContent ?? '');
    expect(filas).toHaveLength(2);
    expect(filas[0]).toContain('DNI');
    expect(filas[0]).toContain('Documento incompleto');
    expect(filas[1]).toContain('Título');
    expect(filas[1]).toContain('Falta sello y/o firma');
    expect(el().querySelector('header')?.textContent).toContain('2');
  });

  it('marca cada uno con la insignia de estado del sistema', async () => {
    await dibujar([rechazo(1, 'DNI', 'Documento incompleto', 1)]);

    expect(el().querySelector('li app-insignia-estado')?.textContent?.trim()).toBe('Rechazado');
  });

  it('cada uno abre Subir Documento con su tipo elegido y un nombre accesible propio', async () => {
    await dibujar([
      rechazo(1, 'DNI', 'Documento incompleto', 1),
      rechazo(2, 'Título', 'Falta sello y/o firma', 2),
    ]);

    const enlaces = Array.from(el().querySelectorAll<HTMLAnchorElement>('li a'));
    expect(enlaces.map((a) => a.getAttribute('href'))).toEqual([
      '/legajo/subir-documento?tipo=1',
      '/legajo/subir-documento?tipo=2',
    ]);
    // Sin esto el lector de pantalla lee "Volver a subir, Volver a subir".
    expect(enlaces.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Volver a subir DNI',
      'Volver a subir Título',
    ]);
  });

  it('si el tipo ya no está entre los de su rol, abre el formulario sin tipo elegido', async () => {
    await dibujar([rechazo(1, 'Curriculum', 'No corresponde a lo solicitado', null)]);

    expect(el().querySelector('li a')?.getAttribute('href')).toBe('/legajo/subir-documento');
  });
});
