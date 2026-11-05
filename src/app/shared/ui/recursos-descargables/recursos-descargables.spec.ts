import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  PerfilRecursos,
  RECURSOS_POR_PERFIL,
  TipoRecurso,
} from '../../../core/configuracion/enlaces-externos';
import { RecursosDescargables } from './recursos-descargables';

describe('RecursosDescargables', () => {
  let fixture: ComponentFixture<RecursosDescargables>;
  const raiz = () => fixture.nativeElement as HTMLElement;
  const enlaces = () => Array.from(raiz().querySelectorAll('a'));

  async function crear(perfil: PerfilRecursos, tipo: TipoRecurso | null = null): Promise<void> {
    await TestBed.configureTestingModule({ imports: [RecursosDescargables] }).compileComponents();
    fixture = TestBed.createComponent(RecursosDescargables);
    fixture.componentRef.setInput('perfil', perfil);
    fixture.componentRef.setInput('tipo', tipo);
    await fixture.whenStable();
  }

  it.each<PerfilRecursos>(['alumno', 'docente'])(
    'al %s le muestra un enlace por cada material que tiene carpeta',
    async (perfil) => {
      await crear(perfil);

      const conCarpeta = RECURSOS_POR_PERFIL[perfil].filter((r) => r.enlace !== null);
      expect(enlaces().map((a) => a.getAttribute('href'))).toEqual(
        conCarpeta.map((r) => r.enlace),
      );
    },
  );

  it('abre cada carpeta en otra pestaña, sin darle acceso a esta', async () => {
    await crear('docente');

    for (const enlace of enlaces()) {
      expect(enlace.getAttribute('target')).toBe('_blank');
      expect(enlace.getAttribute('rel')).toBe('noopener noreferrer');
    }
  });

  it('al docente le muestra los tutoriales de herramientas', async () => {
    await crear('docente');

    expect(raiz().textContent).toContain('Tutoriales de herramientas');
  });

  it('avisa "No hay documentación cargada" donde el cliente todavía no entregó material', async () => {
    await crear('docente');

    const sinCargar = RECURSOS_POR_PERFIL.docente.filter((r) => r.enlace === null);
    expect(sinCargar.length).toBeGreaterThan(0);
    expect(raiz().querySelectorAll('[data-vacio]').length).toBe(sinCargar.length);
    expect(raiz().textContent).toContain('No hay documentación cargada');
  });

  it('al alumno le muestra los formatos institucionales', async () => {
    await crear('alumno');

    expect(raiz().textContent).toContain('Documentos y formatos estudiantiles');
    expect(raiz().textContent).toContain('Convenio de Beca Fundación Encode');
  });

  it('con tipo "documentacion" no muestra los tutoriales', async () => {
    await crear('docente', 'documentacion');

    expect(raiz().textContent).toContain('Documentación para descargar');
    expect(raiz().textContent).not.toContain('Tutoriales de herramientas');
  });

  it('con tipo "tutorial" muestra solo los tutoriales', async () => {
    await crear('docente', 'tutorial');

    expect(raiz().textContent).toContain('Tutoriales de herramientas');
    expect(raiz().textContent).not.toContain('Plantillas y normas IRAM/ISO');
  });

  it('avisa "No hay tutoriales cargados" al alumno, que todavía no tiene', async () => {
    await crear('alumno', 'tutorial');

    expect(raiz().textContent).toContain('No hay tutoriales cargados');
    expect(enlaces().length).toBe(0);
  });
});
