import { ContenidoUnidad } from './contenido-unidad';

/**
 * Lo que el frontend le manda a `POST /api/ProgramasMateria`.
 *
 * Coincide campo por campo con el `CrearProgramaDto` del backend (verificado
 * contra el PR #4 del repositorio de la API). A diferencia del login, acá los
 * nombres vienen en una sola convención — no hace falta traducir nada antes
 * de enviar. El backend deserializa JSON sin distinguir mayúsculas, así que
 * nuestro `camelCase` entra bien en su DTO `PascalCase`.
 *
 * El backend responde `{ message, idPrograma }`. Ese `idPrograma` es el que
 * después se usa para pedir el PDF (ver `ProgramasMateriaService`).
 */
export interface ProgramaMateria {
  idDocente: number;
  idMateria: number;
  condicion: string;
  /**
   * Texto de la sección 1 del programa.
   *
   * No es opcional en la práctica: el generador de PDF del backend abre el
   * documento con el título "1. Fundamentación" seguido de este texto. Si va
   * vacío, el PDF sale con su primera sección en blanco.
   */
  fundamentacion: string;
  objetivosEspecificos: string;
  objetivosGenerales: string;
  horasSemanales: string;
  horasCuatrimestrales: string;
  evaluacion: string;
  criteriosEvaluacion: string;
  estrategiasMetodologicas: string;
  estrategiasAcompanamientoVirtualRemoto: string;
  condicionRegular: string;
  condicionPromocional: string;
  condicionLibre: string;
  examenesVirtuales: string;
  formatoCurricular: string;
  cicloLectivo: string;
  contenidos: ContenidoUnidad[];
}
