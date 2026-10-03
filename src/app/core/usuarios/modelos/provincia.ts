/**
 * Una provincia de nacimiento, con el id que espera `CargaUsuarioDto.IdProvincia`.
 *
 * Sale de `UsuariosService.listarProvincias()`, que arma la lista con
 * `GET /api/Ubicaciones/paises` y `.../paises/{id}/provincias`. Los ids son
 * los de la base: no se inventan ni se asumen del lado del frontend.
 */
export interface Provincia {
  idProvincia: number;
  nombre: string;
  /** Nombre del país al que pertenece: el desplegable agrupa por esto. */
  pais: string;
}
