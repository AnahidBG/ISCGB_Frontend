import { formatDate } from '@angular/common';
import { aFechaSola } from '../comun/fechas';
import { DiaCalendario, EstadoDiaCalendario } from './modelos/dia-calendario';
import { PERIODO_DEL_LIMITE } from './periodo-limite';

/** Un mes del calendario. `mes` va de 1 a 12, igual que en la API. */
export interface MesCalendario {
  anio: number;
  mes: number;
}

/** Una celda de la grilla. */
export interface CeldaGrilla {
  /** "2026-10-13": solo la fecha, sin hora ni zona. */
  fecha: string;
  /** El número del día en su mes: 1 a 31. */
  numero: number;
  /** `false` en los días de relleno, que son de los meses vecinos. */
  delMes: boolean;
  esHoy: boolean;
  /** Es un día anterior a hoy. Hoy no cuenta como pasado. */
  esPasado: boolean;
  /** Se puede elegir: es del mes, no pasó y no está completo. Lo habilita o no quien dibuja la grilla. */
  elegible: boolean;
  /** `null` en los días de relleno: no se pidió su mes. */
  dia: DiaCalendario | null;
}

/** Una entrada de la leyenda: qué estado explica y cómo se llama. */
export interface ItemLeyenda {
  estado: EstadoDiaCalendario;
  etiqueta: string;
}

/**
 * Las columnas de la grilla, de lunes a domingo. `largo` es lo que lee un lector
 * de pantalla.
 *
 * La grilla de parciales nombra sus columnas con el locale y el `DatePipe`
 * (`LUNES_A_DOMINGO`). Esta lista sigue acá para los textos que se arman a mano
 * y no pueden depender del idioma del navegador ni del locale registrado, como
 * el de la campana (`notificaciones-mesas.ts`).
 */
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
 * Una semana cualquiera, de lunes a domingo (del 1 al 7 de enero de 2024). Sirve
 * para nombrar las columnas de la grilla con el locale de la aplicación y el
 * `DatePipe`: lo único que importa de estas fechas es el día de la semana.
 */
export const LUNES_A_DOMINGO: readonly Date[] = Array.from(
  { length: 7 },
  (_, posicion) => new Date(2024, 0, 1 + posicion),
);

/**
 * Las semanas de un mes, de lunes a domingo, listas para dibujar la grilla.
 *
 * Cada semana tiene siete días. La primera y la última se completan con días
 * de los meses vecinos (`delMes: false`), así que el mes ocupa 4, 5 o 6 semanas.
 * Un día del mes que no está en `dias` queda sin datos (`dia: null`). Recibe `hoy`
 * por parámetro para seguir siendo una función pura.
 */
export function semanasDelMes(
  mes: MesCalendario,
  dias: readonly DiaCalendario[],
  hoy: Date,
): CeldaGrilla[][] {
  const diaPorFecha = new Map(dias.map((dia) => [dia.fecha, dia]));
  const hoyComoTexto = aFechaSola(hoy);

  // `getDay()` cuenta desde el domingo (0). Con el lunes como primer día, el
  // domingo pasa de 0 a 6: cuántos días de relleno hay antes del 1.
  const relleno = (new Date(mes.anio, mes.mes - 1, 1).getDay() + 6) % 7;
  const diasDelMes = new Date(mes.anio, mes.mes, 0).getDate();
  const semanas = Math.ceil((relleno + diasDelMes) / 7);

  const celdas = Array.from({ length: semanas * 7 }, (_, posicion): CeldaGrilla => {
    // `Date` normaliza los días fuera de rango: 0 es el último del mes anterior.
    const fecha = new Date(mes.anio, mes.mes - 1, 1 - relleno + posicion);
    const delMes = fecha.getMonth() === mes.mes - 1;
    const fechaComoTexto = aFechaSola(fecha);
    const dia = delMes ? (diaPorFecha.get(fechaComoTexto) ?? null) : null;
    // Las fechas "yyyy-MM-dd" se ordenan igual como texto que como fechas.
    const esPasado = fechaComoTexto < hoyComoTexto;

    return {
      fecha: fechaComoTexto,
      numero: fecha.getDate(),
      delMes,
      esHoy: fechaComoTexto === hoyComoTexto,
      esPasado,
      elegible: delMes && !esPasado && dia?.estado !== 'completo',
      dia,
    };
  });

  return Array.from({ length: semanas }, (_, semana) => celdas.slice(semana * 7, semana * 7 + 7));
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

/**
 * "Octubre 2026". El nombre del mes sale del locale (`LOCALE_ID`) y se le pone la
 * inicial en mayúscula, que el locale español no usa.
 *
 * `formatDate` es de Angular y trae sus propios datos de cada locale: no depende
 * del idioma del navegador ni de ICU. Para el español, el locale tiene que estar
 * registrado con `registerLocaleData`.
 */
export function tituloDelMes({ anio, mes }: MesCalendario, locale: string): string {
  const titulo = formatDate(new Date(anio, mes - 1, 1), 'LLLL y', locale);
  return titulo.charAt(0).toLocaleUpperCase(locale) + titulo.slice(1);
}

/** "1 parcial", "2 parciales". */
export function textoDeParciales(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'parcial' : 'parciales'}`;
}

const ETIQUETA_POR_ESTADO: Record<EstadoDiaCalendario, (cantidad: number) => string> = {
  disponible: () => 'Libre',
  ocupado: textoDeParciales,
  completo: () => 'Completo',
};

/** Lo que dice la celda de un día: "Libre", "1 parcial", "2 parciales" o "Completo". */
export function etiquetaDelDia(estado: EstadoDiaCalendario, cantidad: number): string {
  return ETIQUETA_POR_ESTADO[estado](cantidad);
}

/**
 * Los chips de la leyenda, en orden.
 *
 * Con un límite de 2 el estado del medio es "1 parcial", igual que en la celda.
 * Con un límite mayor un día puede tener varios sin estar completo, y el chip
 * pasa a decir "Con parciales". Con un límite de 1 un solo parcial ya completa
 * el día: ese estado no existe y no se lista.
 */
export function leyendaDelCalendario(limite: number): ItemLeyenda[] {
  const libre: ItemLeyenda = { estado: 'disponible', etiqueta: etiquetaDelDia('disponible', 0) };
  const completo: ItemLeyenda = {
    estado: 'completo',
    etiqueta: etiquetaDelDia('completo', limite),
  };

  if (limite <= 1) {
    return [libre, completo];
  }

  const conParciales: ItemLeyenda = {
    estado: 'ocupado',
    etiqueta: limite > 2 ? 'Con parciales' : etiquetaDelDia('ocupado', 1),
  };
  return [libre, conParciales, completo];
}

/** La nota de abajo de la grilla, con el límite vigente y el período que sale de la constante. */
export function textoDelLimite(limite: number): string {
  return `Los días completos ya alcanzaron el límite de ${textoDeParciales(limite)} por ${PERIODO_DEL_LIMITE} que define Secretaría Académica.`;
}

/**
 * Lo que anuncia un lector de pantalla al llegar a un día: "15 de octubre, 1 de 2
 * parciales". Se le suma "completo" cuando alcanzó el límite y "fecha pasada"
 * cuando ya pasó. Sin datos del día dice solo la fecha.
 *
 * Usa el locale para el nombre del mes (ver `tituloDelMes`).
 */
export function descripcionDelDia(celda: CeldaGrilla, locale: string): string {
  const partes = [formatDate(celda.fecha, "d 'de' MMMM", locale)];

  if (celda.dia !== null) {
    const { cantidad, limite } = celda.dia;
    partes.push(`${cantidad} de ${textoDeParciales(limite)}`);
  }
  if (celda.dia?.estado === 'completo') {
    partes.push('completo');
  }
  if (celda.esPasado) {
    partes.push('fecha pasada');
  }
  return partes.join(', ');
}
