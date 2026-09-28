/** Una provincia de nacimiento, con el id que espera `CargaUsuarioDto.IdProvincia`. */
export interface Provincia {
  idProvincia: number;
  nombre: string;
  pais: string;
}

/**
 * Las 24 jurisdicciones argentinas, en orden alfabético, numeradas 1..24.
 *
 * ⚠️ PROVISORIO — hay que confirmarlo con backend. `CargaUsuarioDto` exige
 * un `IdProvincia` (entero, obligatorio) y `Usuarios.id_provincia` tiene una
 * clave foránea a `Provincia` (`FK_Usuarios_Provincia`), pero:
 *
 *   · no existe `GET /api/Provincias` para llenar el desplegable, y
 *   · el script de la base (`SQLQuery2_ACT.sql`) crea las tablas `Pais` y
 *     `Provincia` sin ningún `INSERT`.
 *
 * O sea: hoy no hay de dónde sacar los ids reales. Esta lista asume que la
 * tabla `Provincia` se carga en este mismo orden (alfabético, empezando en 1).
 * Si se cargó distinto, el alta va a guardar la provincia equivocada — o
 * fallar con la clave foránea si la tabla está vacía. La solución de verdad
 * es que el backend publique `GET /api/Provincias` y esta constante se
 * reemplace por esa llamada. Está anotado en docs/alineacion-sprint-2.md.
 */
export const PROVINCIAS: readonly Provincia[] = [
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
