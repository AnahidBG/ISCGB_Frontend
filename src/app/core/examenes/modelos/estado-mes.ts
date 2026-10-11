/** Un día del mes que tiene al menos un examen registrado. */
export interface DiaOcupado {
  /** El día a las 00:00, en hora local: la fecha no se corre por la zona horaria. */
  fecha: Date;
  cantidadExamenes: number;
  /**
   * Lo calcula el backend (`cantidadExamenes >= limiteDiario`). Se confía en
   * este campo y no se recalcula con la cantidad.
   */
  limiteAlcanzado: boolean;
}

/** Cómo está un mes del calendario de exámenes (`GET .../estado-mes`). */
export interface EstadoMes {
  /** Cuántos exámenes admite un día. Es uno solo, para todo el instituto. */
  limiteDiario: number;
  /** Solo los días con exámenes. Los demás días del mes están libres. */
  diasOcupados: DiaOcupado[];
}
