import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { ROLES } from '../auth/modelos/rol';
import { NuevoUsuario } from './modelos/nuevo-usuario';
import { UsuarioInstitucional } from './modelos/usuario-institucional';
import { MENSAJE_USUARIO_DUPLICADO, UsuariosService } from './usuarios.service';

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
    roles: [ROLES.docente],
    estadoLegajo: 'Aprobado',
  },
  {
    idUsuario: 2,
    nombreCompleto: 'Alberto Alumno',
    dni: '22222222',
    roles: [ROLES.alumno],
    estadoLegajo: 'Pendiente',
  },
  {
    idUsuario: 3,
    nombreCompleto: 'Sergio Secretario',
    dni: '44444444',
    roles: [ROLES.secretario],
    estadoLegajo: 'Aprobado',
  },
  {
    idUsuario: 4,
    nombreCompleto: 'Dora Directora y Docente',
    dni: '55555555',
    roles: [ROLES.director, ROLES.docente],
    estadoLegajo: 'Aprobado',
  },
  {
    idUsuario: 5,
    nombreCompleto: 'Nadia Sinrol',
    dni: '66666666',
    roles: [],
    estadoLegajo: null,
  },
  {
    idUsuario: 6,
    nombreCompleto: 'Martín Morales',
    dni: '77777777',
    roles: [ROLES.docente],
    estadoLegajo: 'Rechazado',
  },
  {
    idUsuario: 7,
    nombreCompleto: 'Julieta Juárez',
    dni: '88888888',
    roles: [ROLES.alumno],
    estadoLegajo: 'Rechazado',
  },
  {
    idUsuario: 8,
    nombreCompleto: 'Ramiro Rearte',
    dni: '99999999',
    roles: [ROLES.docente],
    estadoLegajo: 'Pendiente',
  },
];

@Injectable()
export class UsuariosMockService extends UsuariosService {
  /** Los que se dieron de alta en esta sesión, para verlos aparecer en el listado. */
  private readonly agregados: UsuarioInstitucional[] = [];

  listar(): Observable<UsuarioInstitucional[]> {
    return of([...USUARIOS_INVENTADOS, ...this.agregados]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  /**
   * Alta simulada. Sirve para probar la pantalla de punta a punta —incluido
   * el caso de DNI repetido— sin depender de que el backend tenga el endpoint.
   *
   * Se guarda en memoria y nada más: al recargar la página desaparece. Es a
   * propósito, para que a nadie se le confunda con datos reales.
   */
  crear(usuario: NuevoUsuario): Observable<void> {
    const yaExiste = [...USUARIOS_INVENTADOS, ...this.agregados].some(
      (existente) => existente.dni === usuario.dni,
    );

    if (yaExiste) {
      return throwError(() => new Error(MENSAJE_USUARIO_DUPLICADO)).pipe(
        delay(DEMORA_SIMULADA_MS),
      );
    }

    this.agregados.push({
      idUsuario: Date.now(),
      nombreCompleto: `${usuario.nombre} ${usuario.apellido}`.trim(),
      dni: usuario.dni,
      roles: [...usuario.roles],
      // Recién dado de alta: todavía no presentó nada.
      estadoLegajo: null,
    });

    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
