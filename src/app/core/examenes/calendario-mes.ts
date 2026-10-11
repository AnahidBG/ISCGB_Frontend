import { aFechaSola } from '../comun/fechas';
import { DiaOcupado } from './modelos/estado-mes';

/**
 * Cómo está un día del calendario de exámenes (SCRUM-183).
 *
 *   · `Libre`        — sin exámenes.
 *   · `ConExamenes`  — tiene alguno y todavía admite más.
 *   · `Completo`     — alcanzó el límite diario de Secretaría: no admite más.
 */
export type EstadoDia = 'Libre' | 'ConExamenes' | 'Completo';

/** Un mes del calendario. `mes` va de 1 a 12, igual que en la API. */
export interface MesCalendario {
  anio: number;
  mes: number;
}

/** Una celda de la grilla. */
export interface DiaCalendario {
  /** El día a las 00:00, en hora local. */
  fecha: Date;
  /** El número del día en su mes: 1 a 31. */
  numero: number;
  /** `false` en los días de relleno, que son de los meses vecinos. */
  delMes: boolean;
  esHoy: boolean;
  /** `null` en los días de relleno: no se pidió el estado de su mes. */
  estado: EstadoDia | null;
  /** Cuántos exámenes tiene. `0` si está libre o es de relleno. */
  cantidad: number;
}

/** Una entrada de la leyenda: qué estado explica y cómo se llama. */
export interface ItemLeyenda {
  estado: EstadoDia;
  etiqueta: string;
}

/** Las columnas de la grilla, de lunes a domingo. `largo` es lo que lee un lector de pantalla. */
export const DIAS_DE_LA_SEMANA = [
  { corto: 'Lun', largo: 'Lunes' },
  { corto: 'Mar', largo: 'Martes' },
  { corto: 'Mié', largo: 'Miércoles' },
  { corto: 'Jue', largo: 'Jueves' },
  { corto: 'Vie', largo: 'Viernes' },
  { corto: 'Sáb', largo: 'Sábado' },
  { corto: 'Dom', largo: 'Domingo' },
] as const;

/**
 * Una lista fija y no `toLocaleDateString`: el nombre no depende del idioma del
 * navegador ni de los datos de ICU del entorno, y así es el mismo en los tests.
 */
const NOMBRES_DE_LOS_MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/**
 * El estado de un día, a partir de lo que informa el backend.
 *
 * `undefined` es un día que el backend no listó: `estado-mes` solo trae los días
 * con exámenes, así que cualquier otro está libre. El límite NO se recalcula: lo
 * calcula el backend y llega en `limiteAlcanzado`.
 */
export function estadoDelDia(ocupado: DiaOcupado | undefined): EstadoDia {
  if (ocupado === undefined) {
    return 'Libre';
  }
  if (ocupado.limiteAlcanzado) {
    return 'Completo';
  }
  return ocupado.cantidadExamenes > 0 ? 'ConExamenes' : 'Libre';
}

/**
 * Las semanas de un mes, de lunes a domingo, listas para dibujar la grilla.
 *
 * Cada semana tiene siete días. La primera y la última se completan con días
 * de los meses vecinos (`delMes: false`), así que el mes ocupa 4, 5 o 6 semanas.
 * Recibe `hoy` por parámetro para seguir siendo una función pura.
 */
export function semanasDelMes(
  mes: MesCalendario,
  diasOcupados: readonly DiaOcupado[],
  hoy: Date,
): DiaCalendario[][] {
  const ocupadoPorFecha = new Map(diasOcupados.map((dia) => [aFechaSola(dia.fecha), dia]));
  const hoyComoTexto = aFechaSola(hoy);

  // `getDay()` cuenta desde el domingo (0). Con el lunes como primer día, el
  // domingo pasa de 0 a 6: cuántos días de relleno hay antes del 1.
  const relleno = (new Date(mes.anio, mes.mes - 1, 1).getDay() + 6) % 7;
  const diasDelMes = new Date(mes.anio, mes.mes, 0).getDate();
  const semanas = Math.ceil((relleno + diasDelMes) / 7);

  const dias = Array.from({ length: semanas * 7 }, (_, posicion): DiaCalendario => {
    // `Date` normaliza los días fuera de rango: 0 es el último del mes anterior.
    const fecha = new Date(mes.anio, mes.mes - 1, 1 - relleno + posicion);
    const delMes = fecha.getMonth() === mes.mes - 1;
    const fechaComoTexto = aFechaSola(fecha);
    const ocupado = delMes ? ocupadoPorFecha.get(fechaComoTexto) : undefined;

    return {
      fecha,
      numero: fecha.getDate(),
      delMes,
      esHoy: fechaComoTexto === hoyComoTexto,
      estado: delMes ? estadoDelDia(ocupado) : null,
      cantidad: ocupado?.cantidadExamenes ?? 0,
    };
  });

  return Array.from({ length: semanas }, (_, semana) => dias.slice(semana * 7, semana * 7 + 7));
}

/** El mes de una fecha. */
export function mesDe(fecha: Date): MesCalendario {
  return { anio: fecha.getFullYear(), mes: fecha.getMonth() + 1 };
}

/** El mes anterior. Enero pasa a diciembre del año anterior. */
export function mesAnterior({ anio, mes }: MesCalendario): MesCalendario {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/** El mes siguiente. Diciembre pasa a enero del año siguiente. */
export function mesSiguiente({ anio, mes }: MesCalendario): MesCalendario {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

/** "Octubre". `mes` va de 1 a 12. */
export function nombreDelMes(mes: number): string {
  return NOMBRES_DE_LOS_MESES[mes - 1];
}

/** "Octubre 2026". */
export function tituloDelMes({ anio, mes }: MesCalendario): string {
  return `${nombreDelMes(mes)} ${anio}`;
}

/** "1 examen", "2 exámenes". */
export function textoDeExamenes(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'examen' : 'exámenes'}`;
}

const ETIQUETA_POR_ESTADO: Record<EstadoDia, (cantidad: number) => string> = {
  Libre: () => 'Libre',
  ConExamenes: textoDeExamenes,
  Completo: () => 'Completo',
};

/** Lo que dice la celda de un día: "Libre", "1 examen", "2 exámenes" o "Completo". */
export function etiquetaDelDia(estado: EstadoDia, cantidad: number): string {
  return ETIQUETA_POR_ESTADO[estado](cantidad);
}

/**
 * Los chips de la leyenda, en orden.
 *
 * Con un límite de 2 el estado del medio es "1 examen", igual que en la
 * celda. Con un límite mayor un día puede tener varios sin estar completo, y
 * el chip pasa a decir "Con exámenes". Con un límite de 1 un solo examen ya
 * completa el día: ese estado no existe y no se lista.
 */
export function leyendaDelCalendario(limiteDiario: number): ItemLeyenda[] {
  const libre: ItemLeyenda = { estado: 'Libre', etiqueta: etiquetaDelDia('Libre', 0) };
  const completo: ItemLeyenda = {
    estado: 'Completo',
    etiqueta: etiquetaDelDia('Completo', limiteDiario),
  };

  if (limiteDiario <= 1) {
    return [libre, completo];
  }

  const conExamenes: ItemLeyenda = {
    estado: 'ConExamenes',
    etiqueta: limiteDiario > 2 ? 'Con exámenes' : etiquetaDelDia('ConExamenes', 1),
  };
  return [libre, conExamenes, completo];
}

/** La nota de abajo de la grilla, con el límite vigente. */
export function textoDelLimite(limiteDiario: number): string {
  return `Los días completos ya alcanzaron el límite de ${textoDeExamenes(limiteDiario)} por día que define Secretaría Académica.`;
}
