/**
 * Cómo está un día del calendario de parciales.
 *
 *   · `disponible` — sin parciales (verde).
 *   · `ocupado`    — tiene alguno y todavía admite más (amarillo).
 *   · `completo`   — alcanzó el límite: no admite más (rojo).
 */
export type EstadoDiaCalendario = 'disponible' | 'ocupado' | 'completo';

/**
 * Un día del calendario, tal como lo usa el frontend.
 *
 * No es la respuesta del backend: el adaptador (`aCalendarioDelMes`) la traduce
 * a este modelo, así un cambio en el contrato se arregla en un solo lugar y
 * ninguna pantalla se entera.
 */
export interface DiaCalendario {
  /** "2026-10-13": solo la fecha, sin hora ni zona, así no se corre un día. */
  fecha: string;
  /** Cuántos parciales tiene el día. `0` si el backend no lo lista. */
  cantidad: number;
  /** Cuántos parciales admite el período. Es el mismo para todos los días. */
  limite: number;
  /** Se calcula con `estadoDelDia(cantidad, limite)`. */
  estado: EstadoDiaCalendario;
}
