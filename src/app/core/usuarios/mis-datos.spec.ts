import {
  LARGO_MAXIMO,
  datosAEnviar,
  erroresDeMisDatos,
  hayCambios,
  limpiarMisDatos,
  misDatosDe,
} from './mis-datos';
import { MisDatos } from './modelos/mis-datos';
import { UsuarioDetalle } from './modelos/usuario-detalle';

/** Una persona que nunca cargó nada más que su correo. */
const SIN_CARGAR: MisDatos = {
  email: 'ana@ejemplo.com',
  telefono: '',
  telefonoEmergencia: '',
  contactoEmergencia: '',
  direccion: '',
  lugarNacimiento: '',
  idProvincia: null,
};

/** Una persona con todo cargado. */
const CARGADOS: MisDatos = {
  email: 'ana@ejemplo.com',
  telefono: '3511234567',
  telefonoEmergencia: '3517654321',
  contactoEmergencia: 'Juan Gómez',
  direccion: 'Av. Siempreviva 742',
  lugarNacimiento: 'Villa Dolores',
  idProvincia: 6,
};

describe('datosAEnviar', () => {
  // Desde el backend del 17/10/2026 (commit d771acb), un texto vacío borra el dato.
  it('manda todos los campos sin los espacios de los costados, y los vacíos vacíos', () => {
    const datos: MisDatos = {
      ...SIN_CARGAR,
      email: '  ana@ejemplo.com ',
      telefono: ' 3511234567',
      direccion: '   ', // solo espacios: viaja vacío, y el backend lo borra
    };

    expect(datosAEnviar(datos)).toStrictEqual({
      email: 'ana@ejemplo.com',
      telefono: '3511234567',
      telefonoEmergencia: '',
      contactoEmergencia: '',
      direccion: '',
      lugarNacimiento: '',
      idProvincia: 0,
    });
  });

  it('la provincia viaja con su id, y sin ninguna viaja 0, que el backend lee como "borrarla"', () => {
    expect(datosAEnviar({ ...SIN_CARGAR, idProvincia: 6 })).toHaveProperty('idProvincia', 6);
    expect(datosAEnviar(SIN_CARGAR)).toHaveProperty('idProvincia', 0);
  });
});

describe('erroresDeMisDatos', () => {
  it('sin cambios, o con datos válidos, no hay errores', () => {
    expect(erroresDeMisDatos(CARGADOS, CARGADOS)).toEqual({});
    expect(erroresDeMisDatos({ ...CARGADOS, direccion: 'Belgrano 12' }, CARGADOS)).toEqual({});
  });

  // Desde el backend del 17/10/2026 un campo vacío borra el dato: ya no es un error.
  it.each([
    ['telefono', ''],
    ['telefonoEmergencia', '   '],
    ['contactoEmergencia', ''],
    ['direccion', ''],
    ['lugarNacimiento', ''],
    ['idProvincia', null],
  ] as const)('%s: un dato que ya estaba cargado se puede vaciar para borrarlo', (campo, vacio) => {
    expect(erroresDeMisDatos({ ...CARGADOS, [campo]: vacio }, CARGADOS)).toEqual({});
  });

  it('un dato que nunca se cargó puede quedar vacío', () => {
    expect(erroresDeMisDatos(SIN_CARGAR, SIN_CARGAR)).toEqual({});
  });

  it.each(['', '   ', 'ana', 'ana@ejemplo', 'a na@ejemplo.com'])(
    'el correo "%s" no se acepta',
    (correo) => {
      const errores = erroresDeMisDatos({ ...CARGADOS, email: correo }, CARGADOS);

      expect(Object.keys(errores)).toEqual(['email']);
    },
  );

  it.each(['3511234567', '+54 9 351 123-4567'])('el teléfono "%s" se acepta', (telefono) => {
    const escritos = { ...CARGADOS, telefono, telefonoEmergencia: telefono };

    expect(erroresDeMisDatos(escritos, SIN_CARGAR)).toEqual({});
  });

  it.each(['12345', 'llamar a Juan', '1234567890123456'])(
    'el teléfono "%s" no se acepta, ni en el propio ni en el de emergencia',
    (telefono) => {
      const escritos = { ...CARGADOS, telefono, telefonoEmergencia: telefono };

      expect(Object.keys(erroresDeMisDatos(escritos, SIN_CARGAR)).sort()).toEqual([
        'telefono',
        'telefonoEmergencia',
      ]);
    },
  );

  it('un dato que no se tocó no se vuelve a revisar, aunque no cumpla el formato', () => {
    const viejos: MisDatos = { ...CARGADOS, telefono: 'int. 2 - llamar a la tarde' };

    expect(erroresDeMisDatos({ ...viejos, direccion: 'Belgrano 12' }, viejos)).toEqual({});
  });

  it.each(['email', 'contactoEmergencia', 'direccion', 'lugarNacimiento'] as const)(
    '%s: respeta el largo de la columna',
    (campo) => {
      // Un correo largo pero con formato válido, para que falle solo por el largo.
      const demasiado =
        campo === 'email'
          ? `${'a'.repeat(LARGO_MAXIMO[campo])}@ejemplo.com`
          : 'x'.repeat(LARGO_MAXIMO[campo] + 1);
      const errores = erroresDeMisDatos({ ...CARGADOS, [campo]: demasiado }, CARGADOS);

      expect(errores[campo]).toContain(`${LARGO_MAXIMO[campo]} caracteres`);
    },
  );
});

describe('hayCambios', () => {
  it('ignora los espacios de los costados y detecta cualquier otro cambio', () => {
    expect(hayCambios({ ...CARGADOS, direccion: ' Av. Siempreviva 742 ' }, CARGADOS)).toBe(false);
    expect(hayCambios({ ...CARGADOS, idProvincia: 7 }, CARGADOS)).toBe(true);
    expect(hayCambios({ ...CARGADOS, telefono: '3510000000' }, CARGADOS)).toBe(true);
  });
});

describe('misDatosDe y limpiarMisDatos', () => {
  it('lo que el servidor no tiene cargado (nulo) pasa a texto vacío', () => {
    const detalle = {
      idUsuario: 5,
      dni: '12345678',
      nombre: 'Ana',
      apellido: 'Pérez',
      email: 'ana@ejemplo.com',
      telefono: null,
      telefonoEmergencia: null,
      lugarNacimiento: null,
      contactoEmergencia: null,
      direccion: null,
      idProvincia: null,
      fechaNac: null,
      estadoUsuario: true,
      roles: [],
      rolesConId: [],
    } satisfies UsuarioDetalle;

    expect(misDatosDe(detalle)).toEqual(SIN_CARGAR);
  });

  it('limpiar recorta los textos y deja la provincia como está', () => {
    expect(limpiarMisDatos({ ...CARGADOS, direccion: '  Belgrano 12  ' })).toEqual({
      ...CARGADOS,
      direccion: 'Belgrano 12',
    });
  });
});
