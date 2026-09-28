import { Rol } from '../../auth/modelos/rol';

/**
 * Los datos para editar el perfil de una persona ya existente — Sprint 2,
 * historia "Gestión de usuarios y roles" (Director).
 *
 * A PROPÓSITO tiene EXACTAMENTE los mismos campos que `NuevoUsuario` (menos
 * `dni` y `password`, que acá no se editan): es el mismo contrato ya
 * documentado en `docs/contrato-alta-usuario.md`, no uno inventado nuevo.
 *
 * ⚠️ El criterio de Sprint 2 pide además CUIL, Sexo/Género, N° Legajo,
 * Carrera/Especialidad y marcar a un Docente como Director Suplente. Esos
 * campos NO se agregan acá a propósito: ni existen como columna en la base
 * (`Usuarios`/`Docentes`, confirmado el 25/09/2026) ni hay ningún contrato
 * documentado sobre cómo el backend los va a esperar. Mandarlos igual sería
 * adivinar una forma que después puede no coincidir con la real — mejor
 * pedirle al backend que primero defina el contrato (mismo trámite que ya
 * se hizo para `NuevoUsuario`) antes de que el frontend le mande cualquier
 * cosa. Quedan afuera de esta pantalla hasta que eso exista.
 *
 * ⚠️ El backend todavía no tiene el endpoint (`PUT /api/Usuarios/{id}` no
 * existe, confirmado con Swagger). La pantalla se construye igual, lista
 * para funcionar en cuanto se publique.
 */
export interface DatosEditarUsuario {
  nombre: string;
  apellido: string;
  email: string;
  roles: Rol[];

  /** `true` = puede iniciar sesión. Destildarlo es la "baja" del criterio: nunca se borra a nadie. */
  activo: boolean;

  telefono: string | null;
  fechaNacimiento: Date | null;
  direccion: string | null;
  lugarNacimiento: string | null;
  contactoEmergencia: string | null;
  telefonoEmergencia: string | null;
}
