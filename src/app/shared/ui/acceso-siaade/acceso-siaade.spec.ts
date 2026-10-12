import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ENLACE_SIAADE, PerfilSiaade } from '../../../core/configuracion/enlaces-externos';
import { AccesoSiaade } from './acceso-siaade';

describe('AccesoSiaade', () => {
  let fixture: ComponentFixture<AccesoSiaade>;
  const enlace = () => (fixture.nativeElement as HTMLElement).querySelector('a')!;

  async function crear(perfil: PerfilSiaade): Promise<void> {
    await TestBed.configureTestingModule({ imports: [AccesoSiaade] }).compileComponents();
    fixture = TestBed.createComponent(AccesoSiaade);
    fixture.componentRef.setInput('perfil', perfil);
    await fixture.whenStable();
  }

  it.each<PerfilSiaade>(['alumno', 'docente'])(
    'al %s lo lleva a su entrada de SIAADE',
    async (perfil) => {
      await crear(perfil);

      expect(enlace().getAttribute('href')).toBe(ENLACE_SIAADE[perfil]);
    },
  );

  it('abre en otra pestaña, sin darle al otro sitio acceso a esta, y lo avisa', async () => {
    await crear('alumno');

    expect(enlace().getAttribute('target')).toBe('_blank');
    expect(enlace().getAttribute('rel')).toBe('noopener noreferrer');
    expect(enlace().textContent).toContain('Se abre en otra pestaña');
  });

  it('al alumno le dice para qué entra', async () => {
    await crear('alumno');

    expect(enlace().textContent).toContain('situación académica');
    expect(enlace().textContent).toContain('datos personales');
  });
});
