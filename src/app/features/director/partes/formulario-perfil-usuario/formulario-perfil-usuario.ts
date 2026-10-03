import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { esDniValido, formatearDni, normalizarDni } from '../../../../core/auth/dni';
import { ROLES, Rol } from '../../../../core/auth/modelos/rol';
import { aFechaSola, desdeFechaSola } from '../../../../core/comun/fechas';
import { cuilCoincideConDni, esCuilValido, normalizarCuil } from '../../../../core/usuarios/cuil';
import {
  OPCIONES_DE_GENERO,
  OPCIONES_DE_ROL,
  PerfilUsuario,
} from '../../../../core/usuarios/modelos/perfil-usuario';
import { Provincia } from '../../../../core/usuarios/modelos/provincia';

/** Los datos con los que arranca el formulario en "Editar Usuario". Todo es opcional. */
export type PerfilInicial = Partial<PerfilUsuario>;

/** Campos de texto obligatorios, con el mensaje que se muestra si quedan vacíos. */
const OBLIGATORIOS = {
  nombre: 'Ingresá el nombre.',
  apellido: 'Ingresá el apellido.',
  genero: 'Elegí una opción.',
  direccion: 'Ingresá el domicilio.',
  telefono: 'Ingresá un teléfono de contacto.',
  contactoEmergencia: 'Ingresá a quién avisar en una emergencia.',
  telefonoEmergencia: 'Ingresá el teléfono de ese contacto.',
  afiliacionEmergencia: 'Ingresá la obra social o prepaga (o "Ninguna").',
} as const;

type CampoObligatorio = keyof typeof OBLIGATORIOS;

/**
 * El formulario del perfil de una persona — Sprint 2, "Gestión de usuarios y
 * roles" (SCRUM-16). Lo comparten "Nuevo Usuario" y "Editar Usuario".
 *
 * PRESENTACIONAL: no conoce `UsuariosService` ni la sesión. Recibe con qué
 * arrancar y si está enviando, y emite el `PerfilUsuario` ya limpio (DNI y
 * CUIL solo dígitos, textos con `trim()`). Mismo patrón que
 * `FormularioLogin` y `FormularioProgramaMateria`. Vive en
 * `features/director/partes/` y no en `shared/` porque solo lo usa Dirección.
 *
 * Las secciones siguen el criterio de aceptación al pie de la letra:
 * "Datos personales" (nombre, CUIL, DNI, correo, sexo/género, domicilio,
 * contacto de emergencia con afiliación, lugar de nacimiento) e
 * "Información académica" (rol, N.° de legajo autocompletado con el DNI,
 * director suplente).
 *
 * En modo edición:
 *   · El DNI no se toca: es el usuario del login y el N.° de legajo.
 *   · El rol se muestra pero no se cambia: `PUT /api/UsuariosAdmin/modificar`
 *     hoy guarda solo nombre, apellido y director suplente — ofrecer un
 *     selector de rol que el servidor ignora sería mentirle al Director.
 */
@Component({
  selector: 'app-formulario-perfil-usuario',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-perfil-usuario.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioPerfilUsuario implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly modo = input<'alta' | 'edicion'>('alta');
  readonly perfilInicial = input<PerfilInicial | null>(null);
  readonly enviando = input(false);
  readonly error = input<string | null>(null);
  readonly textoEnviar = input('Guardar');

  /**
   * Las provincias las trae el contenedor (este componente no inyecta
   * servicios). Pueden llegar DESPUÉS de `perfilInicial`: son dos pedidos
   * independientes. No hace falta ningún `effect` para preseleccionar: el
   * control ya tiene el id guardado y, cuando aparecen las `<option>`, el
   * `<select>` se vuelve a sincronizar con el valor del control.
   */
  readonly provincias = input<readonly Provincia[]>([]);
  readonly cargandoProvincias = input(false);
  readonly falloProvincias = input(false);

  /**
   * Las mismas provincias agrupadas por país, en el orden en que llegaron
   * (el backend ya las ordena por nombre). Un solo desplegable agrupado y no
   * dos en cascada: el control sigue siendo uno solo (`idProvincia`) y la
   * edición no necesita saber el país, que el backend no devuelve.
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

  readonly guardar = output<PerfilUsuario>();
  readonly cancelar = output<void>();

  protected readonly opcionesDeRol = OPCIONES_DE_ROL;
  protected readonly opcionesDeGenero = OPCIONES_DE_GENERO;
  protected readonly rolDocente = ROLES.docente;

  protected readonly seIntentoEnviar = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    dni: ['', Validators.required],
    cuil: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    genero: ['', Validators.required],
    direccion: ['', Validators.required],
    telefono: ['', Validators.required],
    idProvincia: ['', Validators.required],
    fechaNacimiento: [''],
    contactoEmergencia: ['', Validators.required],
    telefonoEmergencia: ['', Validators.required],
    afiliacionEmergencia: ['', Validators.required],
    rol: ['' as Rol | '', Validators.required],
    esDirectorSuplente: [false],
  });

  private readonly dniEscrito = toSignal(this.formulario.controls.dni.valueChanges, {
    initialValue: '',
  });

  protected readonly rolElegido = toSignal(this.formulario.controls.rol.valueChanges, {
    initialValue: '' as Rol | '',
  });

  /** "Que se autocomplete legajo con DNI": el backend usa el DNI como N.° de legajo. */
  protected readonly numeroLegajo = computed(() => {
    const dni = normalizarDni(this.dniEscrito());
    return dni === '' ? '—' : formatearDni(dni);
  });

  /** Director suplente solo existe para Docentes (`Docentes.director_suplente`). */
  protected readonly puedeSerSuplente = computed(() => this.rolElegido() === ROLES.docente);

  protected readonly esEdicion = computed(() => this.modo() === 'edicion');

  constructor() {
    // Se deshabilita el CONTROL y no solo el `<select>`: con formularios
    // reactivos, Angular pisa el atributo `disabled` del DOM con el estado del
    // control. Mientras carga, `enviar()` además no hace nada (ver abajo).
    effect(() => {
      const control = this.formulario.controls.idProvincia;
      if (this.cargandoProvincias()) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    const inicial = this.perfilInicial();
    if (inicial !== null) {
      this.formulario.patchValue({
        nombre: inicial.nombre ?? '',
        apellido: inicial.apellido ?? '',
        dni: inicial.dni ? formatearDni(inicial.dni) : '',
        cuil: inicial.cuil ?? '',
        email: inicial.email ?? '',
        genero: inicial.genero ?? '',
        direccion: inicial.direccion ?? '',
        telefono: inicial.telefono ?? '',
        idProvincia: inicial.idProvincia ? String(inicial.idProvincia) : '',
        fechaNacimiento: inicial.fechaNacimiento ? aFechaSola(inicial.fechaNacimiento) : '',
        contactoEmergencia: inicial.contactoEmergencia ?? '',
        telefonoEmergencia: inicial.telefonoEmergencia ?? '',
        afiliacionEmergencia: inicial.afiliacionEmergencia ?? '',
        rol: inicial.rol ?? '',
        esDirectorSuplente: inicial.esDirectorSuplente ?? false,
      });
    }

    if (this.esEdicion()) {
      this.formulario.controls.dni.disable();
      this.formulario.controls.rol.disable();
    }
  }

  protected enviar(): void {
    this.seIntentoEnviar.set(true);

    // Con las provincias cargando, el control de provincia está deshabilitado
    // y no cuenta para la validez: sin este corte se podría enviar vacío.
    if (
      this.cargandoProvincias() ||
      this.formulario.invalid ||
      this.hayErroresPropios() ||
      this.enviando()
    ) {
      return;
    }

    const v = this.formulario.getRawValue();
    const rol = v.rol as Rol;

    this.guardar.emit({
      nombre: v.nombre.trim(),
      apellido: v.apellido.trim(),
      dni: normalizarDni(v.dni),
      cuil: normalizarCuil(v.cuil),
      email: v.email.trim(),
      genero: v.genero,
      direccion: v.direccion.trim(),
      telefono: v.telefono.trim(),
      idProvincia: Number(v.idProvincia),
      fechaNacimiento: desdeFechaSola(v.fechaNacimiento),
      contactoEmergencia: v.contactoEmergencia.trim(),
      telefonoEmergencia: v.telefonoEmergencia.trim(),
      afiliacionEmergencia: v.afiliacionEmergencia.trim(),
      rol,
      esDirectorSuplente: rol === ROLES.docente && v.esDirectorSuplente,
    });
  }

  // ── Errores por campo ────────────────────────────────────────────────────
  // Todos se callan hasta el primer intento de envío: retar a alguien
  // mientras todavía está escribiendo es mala educación. Mismo criterio que
  // `FormularioLogin`.

  protected errorObligatorio(campo: CampoObligatorio): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    return this.formulario.controls[campo].value.trim() === '' ? OBLIGATORIOS[campo] : null;
  }

  protected get errorDni(): string | null {
    if (!this.seIntentoEnviar() || this.esEdicion()) {
      return null;
    }
    const valor = this.formulario.controls.dni.value.trim();
    if (valor === '') {
      return 'Ingresá el DNI.';
    }
    return esDniValido(valor) ? null : 'El DNI tiene que tener 7 u 8 números.';
  }

  protected get errorCuil(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    const cuil = this.formulario.controls.cuil.value.trim();
    if (cuil === '') {
      return 'Ingresá el CUIL.';
    }
    if (!esCuilValido(cuil)) {
      return 'Ese CUIL no es válido: revisá los 11 números.';
    }
    const dni = this.formulario.controls.dni.value;
    if (esDniValido(dni) && !cuilCoincideConDni(cuil, dni)) {
      return 'El CUIL no corresponde a ese DNI.';
    }
    return null;
  }

  protected get errorEmail(): string | null {
    if (!this.seIntentoEnviar()) {
      return null;
    }
    const control = this.formulario.controls.email;
    if (control.value.trim() === '') {
      return 'Ingresá el correo. Es a donde van los avisos del sistema.';
    }
    return control.hasError('email') ? 'Ese correo no parece válido.' : null;
  }

  protected get errorProvincia(): string | null {
    return this.seIntentoEnviar() && this.formulario.controls.idProvincia.value === ''
      ? 'Elegí la provincia de nacimiento.'
      : null;
  }

  protected get errorRol(): string | null {
    return this.seIntentoEnviar() && this.formulario.controls.rol.getRawValue() === ''
      ? 'Elegí un rol: sin rol la persona entra al sistema pero no puede hacer nada.'
      : null;
  }

  /**
   * Validaciones que `Validators` no cubre: formato de DNI y CUIL, y textos
   * hechos solo de espacios — `Validators.required` los deja pasar, pero
   * después del `trim()` llegarían vacíos y el backend respondería 400.
   */
  private hayErroresPropios(): boolean {
    const hayVacios = (Object.keys(OBLIGATORIOS) as CampoObligatorio[]).some(
      (campo) => this.errorObligatorio(campo) !== null,
    );
    return (
      hayVacios || this.errorDni !== null || this.errorCuil !== null || this.errorEmail !== null
    );
  }
}
