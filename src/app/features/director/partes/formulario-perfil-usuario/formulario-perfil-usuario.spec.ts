import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilUsuario } from '../../../../core/usuarios/modelos/perfil-usuario';
import { FormularioPerfilUsuario } from './formulario-perfil-usuario';

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
      idProvincia: '6',
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
    expect(emitido!.idProvincia).toBe(6);
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
});
