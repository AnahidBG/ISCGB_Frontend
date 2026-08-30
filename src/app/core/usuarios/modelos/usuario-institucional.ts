import { Rol } from '../../auth/modelos/rol';

/**
 * Una persona del instituto, tal como la lista el panel del Director.
 *
 * ⚠️ Mock. El backend todavía no expone un endpoint para listar usuarios
 * (ver docs/alcance-dashboard-director.md) — este modelo es una apuesta
 * razonable sobre la forma que va a tener esa respuesta, no un contrato
 * confirmado como el de `docs/contrato-api.md`. Cuando el endpoint exista,
 * este archivo es el primer lugar a revisar.
 */
export interface UsuarioInstitucional {
  idUsuario: number;
  nombreCompleto: string;
  dni: string;
  /** Puede tener más de un rol — igual que `Sesion.roles`. */
  roles: Rol[];
  /**
   * Estado del legajo de esa persona.
   *
   * Es `string | null`, no `EstadoDocumento | null`: la base guarda
   * `estado` como `varchar(50) NULL` (ver docs/contrato-api.md), así que el
   * frontend no puede dar por hecho que va a recibir solo uno de los tres
   * valores esperados. `app-insignia-estado` ya maneja ese caso.
   */
  estadoLegajo: string | null;
}
