import { Rol, ROLES } from './modelos/rol';

/** Una persona inventada para entrar al sistema sin backend. */
export interface UsuarioDePrueba {
  /** DNI con el que se inicia sesión. */
  dni: string;
  password: string;
  /** Nombre y apellido, como los mostraría el backend. */
  nombre: string;
  /** Los roles que tiene. Puede tener más de uno. */
  roles: Rol[];
}

/**
 * La contraseña de todos los usuarios de prueba.
 *
 * Es la misma a propósito: quien prueba no tiene que recordar cuál va con
 * cuál, solo el DNI. Que sea única también deja claro que esto es un
 * entorno de mentira.
 */
export const PASSWORD_DE_PRUEBA = 'Test1234';

/**
 * Usuarios inventados para desarrollar y probar sin backend.
 *
 * Hay uno por cada rol del instituto más un par de casos especiales, para
 * poder verificar los `roleGuard` sin depender de que la API esté levantada
 * ni de que existan esas personas en la base.
 *
 * ── Para agregar uno ──────────────────────────────────────────────
 * Copiá cualquier fila, cambiá el DNI y el nombre, y elegí sus roles.
 * Nada más. No hay que tocar ningún otro archivo.
 *
 * ⚠️ DNI INVENTADOS, SIEMPRE.
 *
 * Este archivo está versionado y el repositorio es público. Un DNI real
 * que entre acá queda en el historial de git para siempre: borrarlo en un
 * commit posterior no lo saca, sigue siendo recuperable. Y el sistema que
 * estamos construyendo maneja legajos y datos personales de gente real, así
 * que la costumbre se toma desde ahora, no cuando sea urgente.
 *
 * Los números son secuencias obvias (11111111, 22222222...) justamente para
 * que se note de un vistazo que no son de nadie.
 */
export const USUARIOS_DE_PRUEBA: readonly UsuarioDePrueba[] = [
  {
    dni: '11111111',
    password: PASSWORD_DE_PRUEBA,
    nombre: 'Dolores Docente',
    roles: [ROLES.docente],
  },
  {
    dni: '22222222',
    password: PASSWORD_DE_PRUEBA,
    nombre: 'Alberto Alumno',
    roles: [ROLES.alumno],
  },
  {
    dni: '33333333',
    password: PASSWORD_DE_PRUEBA,
    nombre: 'Delia Directora',
    roles: [ROLES.director],
  },
  {
    dni: '44444444',
    password: PASSWORD_DE_PRUEBA,
    nombre: 'Sergio Secretario',
    roles: [ROLES.secretario],
  },
  {
    // El caso que más fácil se rompe y que nadie prueba: alguien con dos
    // roles. En el instituto pasa de verdad — un director que además dicta
    // una materia. Tiene que poder entrar a las pantallas de los dos.
    dni: '55555555',
    password: PASSWORD_DE_PRUEBA,
    nombre: 'Dora Directora y Docente',
    roles: [ROLES.director, ROLES.docente],
  },
  {
    // Sin roles asignados. Existe en el sistema pero todavía nadie le dio
    // permisos. Tiene que poder entrar y no ver ninguna pantalla protegida,
    // en vez de romperse.
    dni: '66666666',
    password: PASSWORD_DE_PRUEBA,
    nombre: 'Nadia Sinrol',
    roles: [],
  },
];
