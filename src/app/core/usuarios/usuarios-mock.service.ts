import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { ID_ROL, ROLES } from '../auth/modelos/rol';
import { PerfilUsuario } from './modelos/perfil-usuario';
import { Provincia } from './modelos/provincia';
import { UsuarioDetalle } from './modelos/usuario-detalle';
import { UsuarioInstitucional } from './modelos/usuario-institucional';
import { UsuariosService, mensajePerfilActualizado } from './usuarios.service';

/** Cuánto tarda el listado falso, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 500;

/**
 * Usuarios inventados para maquetar el panel del Director.
 *
 * No son los mismos que `usuarios-de-prueba.ts`: aquellos sirven para
 * INICIAR SESIÓN (dni + password) y no tienen estado de legajo; estos son
 * lo que el Director vería LISTADO en pantalla. Se mantienen separados
 * porque responden preguntas distintas — mezclarlos ataría el listado del
 * Director a quién puede loguearse, que no tiene por qué ser lo mismo.
 *
 * Incluye a propósito el mismo caso multi-rol que ya existe en
 * `usuarios-de-prueba.ts` ("Dora Directora y Docente"), para poder probar
 * el panel con una fila que tiene más de un rol.
 */
const USUARIOS_INVENTADOS: readonly UsuarioInstitucional[] = [
  {
    idUsuario: 1,
    nombreCompleto: 'Dolores Docente',
    dni: '11111111',
    email: '11111111@iscgb.edu.ar',
    roles: [ROLES.docente],
    activo: true,
    estadoLegajo: 'Aprobado',
  },
  {
    idUsuario: 2,
    nombreCompleto: 'Alberto Alumno',
    dni: '22222222',
    email: '22222222@iscgb.edu.ar',
    roles: [ROLES.alumno],
    activo: true,
    estadoLegajo: 'Pendiente',
  },
  {
    idUsuario: 3,
    nombreCompleto: 'Sergio Secretario',
    dni: '44444444',
    email: '44444444@iscgb.edu.ar',
    roles: [ROLES.secretario],
    activo: true,
    estadoLegajo: 'Aprobado',
  },
  {
    idUsuario: 4,
    nombreCompleto: 'Dora Directora y Docente',
    dni: '55555555',
    email: '55555555@iscgb.edu.ar',
    roles: [ROLES.director, ROLES.docente],
    activo: true,
    estadoLegajo: 'Aprobado',
  },
  {
    idUsuario: 5,
    nombreCompleto: 'Nadia Sinrol',
    dni: '66666666',
    email: '66666666@iscgb.edu.ar',
    roles: [],
    activo: true,
    estadoLegajo: null,
  },
  {
    idUsuario: 6,
    nombreCompleto: 'Martín Morales',
    dni: '77777777',
    email: '77777777@iscgb.edu.ar',
    roles: [ROLES.docente],
    activo: true,
    estadoLegajo: 'Rechazado',
  },
  {
    idUsuario: 7,
    nombreCompleto: 'Julieta Juárez',
    dni: '88888888',
    email: '88888888@iscgb.edu.ar',
    roles: [ROLES.alumno],
    activo: true,
    estadoLegajo: 'Rechazado',
  },
  {
    idUsuario: 8,
    nombreCompleto: 'Ramiro Rearte',
    dni: '99999999',
    email: '99999999@iscgb.edu.ar',
    roles: [ROLES.docente],
    activo: true,
    estadoLegajo: 'Pendiente',
  },
];

/**
 * Provincias de ejemplo para el desplegable cuando no hay backend. Los ids son
 * inventados (1..24, alfabético) y NO coinciden con los de la base real: sirven
 * para maquetar, no para dar de alta contra el backend.
 */
const PROVINCIAS_DE_EJEMPLO: readonly Provincia[] = [
  'Buenos Aires',
  'Catamarca',
  'Chaco',
  'Chubut',
  'Ciudad Autónoma de Buenos Aires',
  'Córdoba',
  'Corrientes',
  'Entre Ríos',
  'Formosa',
  'Jujuy',
  'La Pampa',
  'La Rioja',
  'Mendoza',
  'Misiones',
  'Neuquén',
  'Río Negro',
  'Salta',
  'San Juan',
  'San Luis',
  'Santa Cruz',
  'Santa Fe',
  'Santiago del Estero',
  'Tierra del Fuego',
  'Tucumán',
].map((nombre, indice) => ({ idProvincia: indice + 1, nombre, pais: 'Argentina' }));

@Injectable()
export class UsuariosMockService extends UsuariosService {
  /** Los que se dieron de alta o se modificaron en esta sesión (en memoria). */
  private readonly usuarios: UsuarioInstitucional[] = USUARIOS_INVENTADOS.map((u) => ({ ...u }));

  /** Nombre del director suplente actual, o `null`. */
  private suplente: string | null = null;

  listar(): Observable<UsuarioInstitucional[]> {
    return of([...this.usuarios]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  /**
   * Alta simulada. Sirve para probar la pantalla de punta a punta sin
   * backend. Se guarda en memoria y nada más: al recargar la página
   * desaparece, a propósito, para que nadie lo confunda con datos reales.
   *
   * Imita las dos reglas de `UsuariosAdminController` que la pantalla tiene
   * que saber mostrar: DNI repetido y un solo director suplente.
   */
  crear(perfil: PerfilUsuario): Observable<string> {
    if (this.usuarios.some((existente) => existente.dni === perfil.dni)) {
      return this.fallar('Ya existe un usuario con ese DNI.');
    }
    if (perfil.roles.includes(ROLES.docente) && perfil.esDirectorSuplente && this.suplente !== null) {
      return this.fallar(
        `Ya existe un director suplente asignado con el nombre: ${this.suplente}.`,
      );
    }

    const nombreCompleto = `${perfil.nombre} ${perfil.apellido}`.trim();
    this.usuarios.push({
      idUsuario: Date.now(),
      nombreCompleto,
      dni: perfil.dni,
      email: perfil.email,
      roles: [...perfil.roles],
      activo: true,
      estadoLegajo: null,
    });
    if (perfil.esDirectorSuplente) {
      this.suplente = nombreCompleto;
    }

    return of(`Usuario creado exitosamente. N.° de legajo: ${perfil.dni}.`).pipe(
      delay(DEMORA_SIMULADA_MS),
    );
  }

  /** Arma un detalle inventado a partir de la fila liviana del listado. */
  obtener(idUsuario: number): Observable<UsuarioDetalle> {
    const encontrado = this.usuarios.find((usuario) => usuario.idUsuario === idUsuario);

    if (encontrado === undefined) {
      return throwError(() => new Error('No encontramos a esa persona.')).pipe(
        delay(DEMORA_SIMULADA_MS),
      );
    }

    const [nombre, ...resto] = encontrado.nombreCompleto.split(' ');

    return of<UsuarioDetalle>({
      idUsuario: encontrado.idUsuario,
      dni: encontrado.dni,
      nombre: nombre ?? '',
      apellido: resto.join(' '),
      email: encontrado.email ?? '',
      telefono: null,
      telefonoEmergencia: null,
      lugarNacimiento: null,
      contactoEmergencia: null,
      direccion: null,
      idProvincia: null,
      fechaNac: null,
      estadoUsuario: encontrado.activo,
      roles: [...encontrado.roles],
      rolesConId: encontrado.roles.map((rol) => ({ idRol: ID_ROL[rol], nombreRol: rol })),
    }).pipe(delay(DEMORA_SIMULADA_MS));
  }

  actualizar(idUsuario: number, perfil: PerfilUsuario): Observable<string> {
    const usuario = this.usuarios.find((u) => u.idUsuario === idUsuario);
    if (usuario === undefined) {
      return this.fallar('Usuario no encontrado.');
    }
    usuario.nombreCompleto = `${perfil.nombre} ${perfil.apellido}`.trim();
    // Igual que el backend: los roles enviados reemplazan a los que había.
    usuario.roles = [...perfil.roles];
    return of(mensajePerfilActualizado(usuario.nombreCompleto)).pipe(delay(DEMORA_SIMULADA_MS));
  }

  darDeBaja(idUsuario: number): Observable<string> {
    const usuario = this.usuarios.find((u) => u.idUsuario === idUsuario);
    if (usuario === undefined) {
      return this.fallar('Usuario no encontrado.');
    }
    usuario.activo = false;
    return of('El usuario ha sido dado de baja (inactivo) correctamente.').pipe(
      delay(DEMORA_SIMULADA_MS),
    );
  }

  reactivar(idUsuario: number): Observable<string> {
    const usuario = this.usuarios.find((u) => u.idUsuario === idUsuario);
    if (usuario === undefined) {
      return this.fallar('Usuario no encontrado.');
    }
    usuario.activo = true;
    return of('El usuario ha sido reactivado correctamente.').pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarProvincias(): Observable<Provincia[]> {
    return of([...PROVINCIAS_DE_EJEMPLO]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  private fallar(mensaje: string): Observable<never> {
    return throwError(() => new Error(mensaje)).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
