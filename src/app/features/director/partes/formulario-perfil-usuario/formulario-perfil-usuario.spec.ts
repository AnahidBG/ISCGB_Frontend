import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilUsuario } from '../../../../core/usuarios/modelos/perfil-usuario';
import { Provincia } from '../../../../core/usuarios/modelos/provincia';
import { FormularioPerfilUsuario } from './formulario-perfil-usuario';

/** Ids a propósito lejos de 1..24: tienen que ser los del backend, no un orden alfabético. */
const PROVINCIAS_DE_PRUEBA: readonly Provincia[] = [
  { idProvincia: 31, nombre: 'Córdoba', pais: 'Argentina' },
  { idProvincia: 32, nombre: 'Salta', pais: 'Argentina' },
  { idProvincia: 55, nombre: 'Colonia', pais: 'Uruguay' },
];

describe('FormularioPerfilUsuario', () => {
  let fixture: ComponentFixture<FormularioPerfilUsuario>;
  let componente: any;
  let emitido: PerfilUsuario | null;

  function completar(valores: Record<string, unknown> = {}): void {
    componente.formulario.setValue({
      nombre: ' María ',
      apellido: 'Gómez',
      dni: '12.345.678',
      cuil: '27-12345678-0',
      email: 'maria@ejemplo.com',
      genero: 'Femenino',
      direccion: 'Av. Siempreviva 742',
      telefono: '3511234567',
      idProvincia: '31',
      fechaNacimiento: '1990-05-14',
      contactoEmergencia: 'Juan Gómez',
      telefonoEmergencia: '3517654321',
      afiliacionEmergencia: 'APROSS',
      rol: 'Docente',
      esDirectorSuplente: true,
      ...valores,
    });
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioPerfilUsuario],
    }).compileComponents();
    fixture = TestBed.createComponent(FormularioPerfilUsuario);
    componente = fixture.componentInstance;
    emitido = null;
    fixture.componentInstance.guardar.subscribe((perfil) => (emitido = perfil));
    await fixture.whenStable();
  });

  it('emite el perfil limpio: DNI y CUIL solo dígitos, provincia numérica, textos sin espacios', () => {
    completar();
    componente.enviar();

    expect(emitido).not.toBeNull();
    expect(emitido!.nombre).toBe('María');
    expect(emitido!.dni).toBe('12345678');
    expect(emitido!.cuil).toBe('27123456780');
    expect(emitido!.idProvincia).toBe(31);
    expect(emitido!.fechaNacimiento!.getDate()).toBe(14);
    expect(emitido!.rol).toBe('Docente');
    expect(emitido!.esDirectorSuplente).toBe(true);
  });

  it('no emite con un CUIL que no corresponde al DNI', () => {
    completar({ cuil: '20-87654321-5' });
    componente.enviar();

    expect(emitido).toBeNull();
    expect(componente.errorCuil).not.toBeNull();
  });

  it('no emite sin rol', () => {
    completar({ rol: '' });
    componente.enviar();

    expect(emitido).toBeNull();
    expect(componente.errorRol).not.toBeNull();
  });

  it('director suplente se descarta si el rol no es Docente', () => {
    completar({ rol: 'Alumno', esDirectorSuplente: true });
    componente.enviar();

    expect(emitido!.esDirectorSuplente).toBe(false);
  });

  it('exige los campos que el backend marca como obligatorios', () => {
    completar({ afiliacionEmergencia: '   ' });
    componente.enviar();

    expect(emitido).toBeNull();
    expect(componente.errorObligatorio('afiliacionEmergencia')).not.toBeNull();
  });

  it('el N.° de legajo se autocompleta con el DNI', () => {
    completar();
    expect(componente.numeroLegajo()).toBe('12.345.678');
  });

  describe('desplegable de provincias', () => {
    function select(): HTMLSelectElement {
      return (fixture.nativeElement as HTMLElement).querySelector('#idProvincia')!;
    }

    async function recrear(inputs: Record<string, unknown>): Promise<void> {
      fixture = TestBed.createComponent(FormularioPerfilUsuario);
      componente = fixture.componentInstance;
      emitido = null;
      fixture.componentInstance.guardar.subscribe((perfil) => (emitido = perfil));
      for (const [nombre, valor] of Object.entries(inputs)) {
        fixture.componentRef.setInput(nombre, valor);
      }
      await fixture.whenStable();
    }

    it('agrupa las provincias recibidas por país, con el id real como value', async () => {
      await recrear({ provincias: PROVINCIAS_DE_PRUEBA });

      const grupos = Array.from(select().querySelectorAll('optgroup'));
      expect(grupos.map((g) => g.label)).toEqual(['Argentina', 'Uruguay']);

      const opciones = (g: HTMLOptGroupElement) =>
        Array.from(g.querySelectorAll('option')).map((o) => [o.value, o.textContent!.trim()]);
      expect(opciones(grupos[0])).toEqual([
        ['31', 'Córdoba'],
        ['32', 'Salta'],
      ]);
      expect(opciones(grupos[1])).toEqual([['55', 'Colonia']]);
    });

    it('al enviar emite el idProvincia real, numérico, de la opción elegida', async () => {
      await recrear({ provincias: PROVINCIAS_DE_PRUEBA });
      completar({ idProvincia: '' });

      select().value = '55';
      select().dispatchEvent(new Event('change'));
      componente.enviar();

      expect(emitido!.idProvincia).toBe(55);
    });

    it('en edición, preselecciona la provincia aunque lleguen después de los datos iniciales', async () => {
      await recrear({
        modo: 'edicion',
        perfilInicial: { idProvincia: 55, nombre: 'María' },
      });
      expect(select().value).toBe('');

      fixture.componentRef.setInput('provincias', PROVINCIAS_DE_PRUEBA);
      await fixture.whenStable();

      expect(select().value).toBe('55');
      expect(select().selectedOptions[0].textContent!.trim()).toBe('Colonia');
    });

    it('en edición, preselecciona la provincia si ya estaban cargadas', async () => {
      await recrear({
        modo: 'edicion',
        perfilInicial: { idProvincia: 32 },
        provincias: PROVINCIAS_DE_PRUEBA,
      });

      expect(select().value).toBe('32');
    });

    it('mientras carga, el desplegable está deshabilitado y lo dice', async () => {
      await recrear({ cargandoProvincias: true });

      expect(select().disabled).toBe(true);
      expect(select().textContent).toContain('Cargando provincias');
    });

    it('mientras las provincias cargan no envía, aunque el resto esté completo', async () => {
      await recrear({ cargandoProvincias: true });
      completar({ idProvincia: '' });

      componente.enviar();

      expect(emitido).toBeNull();
    });

    it('si falla la carga, muestra el aviso y el resto del formulario sigue visible', async () => {
      await recrear({ falloProvincias: true });

      const html = fixture.nativeElement as HTMLElement;
      expect(html.textContent).toContain('No pudimos cargar las provincias');
      expect(html.querySelector('#nombre')).not.toBeNull();
      expect(html.querySelector('#dni')).not.toBeNull();
    });

    it('sin carga ni fallo no muestra ningún aviso de provincias', async () => {
      await recrear({ provincias: PROVINCIAS_DE_PRUEBA });

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(
        'No pudimos cargar las provincias',
      );
      expect(select().disabled).toBe(false);
    });
  });
});
