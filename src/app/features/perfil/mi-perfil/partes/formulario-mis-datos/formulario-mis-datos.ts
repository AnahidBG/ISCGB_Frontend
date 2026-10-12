import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { map } from 'rxjs';
import {
  CampoDeTexto,
  ErroresDeMisDatos,
  erroresDeMisDatos,
  hayCambios,
  limpiarMisDatos,
} from '../../../../../core/usuarios/mis-datos';
import { MisDatos } from '../../../../../core/usuarios/modelos/mis-datos';
import { Provincia } from '../../../../../core/usuarios/modelos/provincia';
import { Boton } from '../../../../../shared/ui/boton/boton';
import { CampoFormulario } from '../../../../../shared/ui/campo-formulario/campo-formulario';

const CLASES_DEL_CAMPO =
  'w-full rounded-lg border bg-superficie px-4 py-3 text-texto hover:border-acento-verde focus:border-principal focus:ring-2 focus:ring-principal/20 focus:outline-none';

/** Cómo se dibuja cada campo de texto. El orden de la lista es el de la pantalla. */
interface DefinicionDeCampo {
  nombre: CampoDeTexto;
  etiqueta: string;
  tipo: 'text' | 'email' | 'tel';
  /** El `autocomplete` del navegador (WCAG 1.3.5); `off` si no hay uno que corresponda. */
  autocompletar: string;
  requerido?: boolean;
  /** Una línea de ayuda debajo del campo. */
  ayuda?: string;
  /** Ocupa las dos columnas de la grilla. */
  anchoCompleto?: boolean;
}

const CAMPOS: readonly DefinicionDeCampo[] = [
  {
    nombre: 'email',
    etiqueta: 'Correo electrónico',
    tipo: 'email',
    autocompletar: 'email',
    requerido: true,
    ayuda: 'Ahí llegan los avisos de documentación.',
  },
  { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel', autocompletar: 'tel' },
  {
    nombre: 'telefonoEmergencia',
    etiqueta: 'Teléfono de emergencia',
    tipo: 'tel',
    autocompletar: 'off',
  },
  {
    nombre: 'contactoEmergencia',
    etiqueta: 'Contacto de emergencia',
    tipo: 'text',
    autocompletar: 'off',
  },
  {
    nombre: 'direccion',
    etiqueta: 'Dirección',
    tipo: 'text',
    autocompletar: 'street-address',
    anchoCompleto: true,
  },
  {
    nombre: 'lugarNacimiento',
    etiqueta: 'Lugar de nacimiento',
    tipo: 'text',
    autocompletar: 'off',
  },
];

/** Los valores del formulario: todos texto, tal como los entregan los controles del navegador. */
interface ValoresDelFormulario {
  email: string;
  telefono: string;
  telefonoEmergencia: string;
  contactoEmergencia: string;
  direccion: string;
  lugarNacimiento: string;
  /** El `value` del `<option>` elegido: el id de la provincia, o vacío si no hay ninguna. */
  idProvincia: string;
}

function aValores(datos: MisDatos): ValoresDelFormulario {
  return { ...datos, idProvincia: datos.idProvincia === null ? '' : String(datos.idProvincia) };
}

function aMisDatos(valores: ValoresDelFormulario): MisDatos {
  return {
    ...valores,
    idProvincia: valores.idProvincia === '' ? null : Number(valores.idProvincia),
  };
}

/**
 * El formulario de "Mi perfil": los datos de contacto que la persona edita de sí misma.
 *
 * Presentacional (Mediator, `docs/patrones-frontend.md` §2.5): no conoce el servicio
 * ni la sesión. Recibe lo que está guardado y cómo mostrarse, y avisa por `guardar`
 * con los datos ya limpios. Quien guarda es `MiPerfil`.
 *
 * Las reglas (qué se puede dejar vacío, qué formato tiene un correo o un teléfono)
 * viven en funciones puras de `core/usuarios/mis-datos.ts`: acá solo se las conecta.
 * Los errores aparecen recién al primer intento de guardar, para no retar a quien
 * todavía está escribiendo. El botón queda apagado mientras no haya nada distinto de
 * lo guardado.
 */
@Component({
  selector: 'app-formulario-mis-datos',
  imports: [ReactiveFormsModule, CampoFormulario, Boton],
  templateUrl: './formulario-mis-datos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioMisDatos {
  private readonly fb = inject(FormBuilder);

  /** Lo que está guardado: el punto de partida del formulario y contra lo que se compara. */
  readonly datosGuardados = input.required<MisDatos>();

  readonly provincias = input.required<readonly Provincia[]>();

  /** `true` mientras se está guardando. */
  readonly guardando = input<boolean>(false);

  /** El aviso de que el guardado salió bien. */
  readonly confirmacion = input<string | null>(null);

  /** Por qué falló el guardado, en palabras del servidor. */
  readonly errorServidor = input<string | null>(null);

  /** Se emite con los datos, ya limpios y validados. */
  readonly guardar = output<MisDatos>();

  protected readonly campos = CAMPOS;

  /** Se pone en `true` al primer intento de guardar, para no retar antes de tiempo. */
  protected readonly seIntentoGuardar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    email: '',
    telefono: '',
    telefonoEmergencia: '',
    contactoEmergencia: '',
    direccion: '',
    lugarNacimiento: '',
    idProvincia: '',
  });

  /** Lo que hay escrito ahora, como signal: de ahí salen los cambios y los errores. */
  private readonly escrito = toSignal(
    this.formulario.valueChanges.pipe(map(() => aMisDatos(this.formulario.getRawValue()))),
    { initialValue: aMisDatos(this.formulario.getRawValue()) },
  );

  protected readonly sinCambios = computed(
    () => !hayCambios(this.escrito(), this.datosGuardados()),
  );

  protected readonly errores = computed<ErroresDeMisDatos>(() =>
    this.seIntentoGuardar() ? erroresDeMisDatos(this.escrito(), this.datosGuardados()) : {},
  );

  /**
   * El aviso de "se guardó" solo vale mientras el formulario no tiene nada nuevo: si la
   * persona vuelve a escribir, ya no describe lo que hay en pantalla.
   */
  protected readonly avisoDeGuardado = computed(() =>
    this.sinCambios() ? this.confirmacion() : null,
  );

  /**
   * Las provincias agrupadas por país, en el orden en que llegaron (el backend ya las
   * ordena por nombre). Un solo desplegable agrupado y no dos en cascada: el dato que
   * se guarda es solo la provincia.
   */
  protected readonly provinciasPorPais = computed(() => {
    const grupos = new Map<string, Provincia[]>();
    for (const provincia of this.provincias()) {
      const grupo = grupos.get(provincia.pais) ?? [];
      grupo.push(provincia);
      grupos.set(provincia.pais, grupo);
    }
    return Array.from(grupos, ([pais, provincias]) => ({ pais, provincias }));
  });

  constructor() {
    // Lo guardado llega por `input()` y cambia al guardar: el formulario arranca de ahí
    // cada vez. Es un `effect` porque el formulario reactivo no es un signal y hay que
    // escribirle.
    effect(() => {
      this.formulario.reset(aValores(this.datosGuardados()));
      this.seIntentoGuardar.set(false);
    });
  }

  /** Las clases de un campo: el borde rojo si tiene error. */
  protected clasesDe(error: string | undefined): string {
    return `${CLASES_DEL_CAMPO} ${error === undefined ? 'border-borde' : 'border-rechazado'}`;
  }

  /** Une la ayuda de un campo con su error, para que un lector de pantalla lea los dos. */
  protected descripcionDe(campo: DefinicionDeCampo): string | null {
    const ids = [
      campo.ayuda === undefined ? null : `mis-datos-${campo.nombre}-ayuda`,
      this.errores()[campo.nombre] === undefined ? null : `mis-datos-${campo.nombre}-error`,
    ].filter((id) => id !== null);
    return ids.length === 0 ? null : ids.join(' ');
  }

  protected alGuardar(): void {
    this.seIntentoGuardar.set(true);

    const datos = limpiarMisDatos(this.escrito());
    const hayErrores = Object.keys(erroresDeMisDatos(datos, this.datosGuardados())).length > 0;
    if (hayErrores || this.sinCambios() || this.guardando()) {
      return;
    }

    this.guardar.emit(datos);
  }
}
