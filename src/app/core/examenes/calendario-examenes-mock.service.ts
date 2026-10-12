import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { aFechaSola, desdeFechaSola } from '../comun/fechas';
import { EstadoMesApi, aCalendarioDelMes } from './adaptador-estado-mes';
import {
  CalendarioExamenesService,
  MENSAJE_ERROR_CALENDARIO,
  MENSAJE_ERROR_REGISTRAR_EXAMEN,
  MENSAJE_ERROR_REPROGRAMAR_EXAMEN,
} from './calendario-examenes.service';
import { CalendarioDelMes } from './modelos/calendario-del-mes';
import { ExamenCalendario } from './modelos/examen-calendario';
import { MateriaDelDocente } from './modelos/materia-del-docente';
import { MesaAsignada } from './modelos/mesa-asignada';
import { NuevoExamen } from './modelos/nuevo-examen';
import { TipoExamen } from './modelos/tipo-examen';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

/** El valor por defecto del backend cuando nunca se configuró. */
const LIMITE_POR_DEFECTO = 2;

/** Lo que responde el backend (400) cuando el día ya alcanzó el límite. */
const MENSAJE_LIMITE_SUPERADO =
  'No se puede registrar. Se ha superado el límite de parciales para ese día.';

/** Lo que responde el backend (400) al reprogramar a un día que ya alcanzó el límite. */
const MENSAJE_LIMITE_SUPERADO_AL_REPROGRAMAR =
  'No se puede reprogramar. El día ha superado el límite de parciales.';

/** Lo que responde el backend (404) cuando el examen no existe. */
const MENSAJE_EXAMEN_NO_ENCONTRADO = 'No se encontró el examen especificado.';

/** "2026-10-20T09:00:00" → el día y el horario. Lo que el backend lee como un `DateTime` sin zona. */
const FECHA_Y_HORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;

/** Las materias del docente de ejemplo: una de ellas, en dos comisiones. */
const MATERIAS_DEL_DOCENTE: readonly MateriaDelDocente[] = [
  {
    idMateria: 4,
    materia: 'Programación II',
    carrera: 'Tecnicatura en Desarrollo de Software',
    idComision: 1,
    comision: 'Comisión A',
  },
  {
    idMateria: 4,
    materia: 'Programación II',
    carrera: 'Tecnicatura en Desarrollo de Software',
    idComision: 2,
    comision: 'Comisión B',
  },
  { idMateria: 7, materia: 'Redes', carrera: null, idComision: 1, comision: 'Comisión A' },
];

/** Los tipos de examen que hoy tiene la base, con sus nombres tal cual. */
const TIPOS_DE_EXAMEN: readonly TipoExamen[] = [
  { idTipoExamen: 1, nombre: 'Parcial' },
  { idTipoExamen: 2, nombre: 'Recupetario' },
  { idTipoExamen: 3, nombre: 'Parcial Integrador Final' },
  { idTipoExamen: 4, nombre: 'Coloquio' },
];

/** Un parcial de ejemplo: el día del mes en que cae, a qué hora y de qué es. */
interface EjemploDeParcial {
  dia: number;
  horario: string;
  materia: string;
  comision: string;
  tipo: string;
}

/** Los parciales de ejemplo de cualquier mes. */
const EJEMPLOS: readonly EjemploDeParcial[] = [
  {
    dia: 5,
    horario: '09:00',
    materia: 'Introducción a Sistemas',
    comision: 'Comisión 1° A',
    tipo: 'Parcial',
  },
  { dia: 12, horario: '14:00', materia: 'Matemática', comision: 'Comisión 1° A', tipo: 'Parcial' },
  {
    dia: 12,
    horario: '18:30',
    materia: 'Didáctica General',
    comision: 'Comisión 2° A',
    tipo: 'Parcial',
  },
  { dia: 21, horario: '10:00', materia: 'Pedagogía', comision: 'Comisión 2° A', tipo: 'Parcial' },
];

/** Un mes fuera de 1 a 12 falla: es el 500 del backend. */
function esMesValido(mes: number): boolean {
  return Number.isInteger(mes) && mes >= 1 && mes <= 12;
}

/**
 * El calendario de parciales, en memoria.
 *
 * No se usa: `app.config.ts` provee `CalendarioExamenesHttpService`. Queda para
 * seguir trabajando en la pantalla con el backend caído, cambiando una línea.
 *
 * Respeta el contrato del backend: arma una respuesta de `estado-mes` con solo
 * los días que tienen parciales, a medianoche, y la pasa por el mismo adaptador
 * que la API real. Un mes fuera de 1 a 12 falla, como el 500 del backend. El
 * límite arranca en 2 y rechaza 0 o menos con el mismo mensaje; el que se guarda
 * también rige para el calendario.
 *
 * A diferencia de la API real, acá SÍ hay un listado de parciales
 * (`examenesDelMes`), con los mismos días que cuenta `calendarioDelMes`. Los de
 * ejemplo de un mes se cargan la primera vez que se pide ese mes, y desde ahí todo
 * vive en una sola lista en memoria.
 *
 * Registrar un parcial lo suma a la lista, así el día cambia de estado al volver a
 * pedir el mes. Rechaza el día que ya alcanzó el límite con el mismo texto del
 * backend, y una materia, comisión o tipo que no existen con el error genérico (el
 * backend responde 500). No valida la fecha, igual que el backend.
 *
 * Reprogramar mueve un parcial de la lista con la misma regla del límite, sin
 * contar al propio parcial, y con el mismo texto del backend; eliminar lo saca.
 * Un id que no está falla como el 404.
 *
 * Las mesas asignadas caen siempre en el futuro (una y dos semanas desde hoy):
 * así la campana de un docente las muestra sin importar cuándo se use el mock.
 */
@Injectable()
export class CalendarioExamenesMockService extends CalendarioExamenesService {
  private limite = LIMITE_POR_DEFECTO;

  /** Todos los parciales: los de ejemplo de los meses que ya se pidieron y los que se registraron. */
  private readonly examenes: ExamenCalendario[] = [];

  /** Los meses ("2026-10") cuyos parciales de ejemplo ya están en la lista. */
  private readonly mesesConEjemplos = new Set<string>();
  private siguienteIdExamen = 1;

  calendarioDelMes(anio: number, mes: number): Observable<CalendarioDelMes> {
    if (!esMesValido(mes)) {
      return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
    }

    const cantidadPorFecha = new Map<string, number>();
    for (const { fecha } of this.examenesDe(anio, mes)) {
      cantidadPorFecha.set(fecha, (cantidadPorFecha.get(fecha) ?? 0) + 1);
    }

    const respuesta: EstadoMesApi = {
      limiteDiario: this.limite,
      diasOcupados: Array.from(cantidadPorFecha, ([fecha, cantidadExamenes]) => ({
        fecha: `${fecha}T00:00:00`,
        cantidadExamenes,
        limiteAlcanzado: cantidadExamenes >= this.limite,
      })),
    };
    return of(aCalendarioDelMes(respuesta, { anio, mes })).pipe(delay(DEMORA_SIMULADA_MS));
  }

  examenesDelMes(anio: number, mes: number): Observable<ExamenCalendario[]> {
    if (!esMesValido(mes)) {
      return throwError(() => new Error(MENSAJE_ERROR_CALENDARIO));
    }
    return of(this.examenesDe(anio, mes)).pipe(delay(DEMORA_SIMULADA_MS));
  }

  materiasDelDocente(): Observable<MateriaDelDocente[]> {
    return of([...MATERIAS_DEL_DOCENTE]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  tiposDeExamen(): Observable<TipoExamen[]> {
    return of([...TIPOS_DE_EXAMEN]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  registrarExamen(examen: NuevoExamen): Observable<void> {
    const materia = MATERIAS_DEL_DOCENTE.find(
      ({ idMateria, idComision }) =>
        idMateria === examen.idMateria && idComision === examen.idComision,
    );
    const tipo = TIPOS_DE_EXAMEN.find(({ idTipoExamen }) => idTipoExamen === examen.idTipoExamen);
    const fecha = desdeFechaSola(examen.dia);

    // El backend no valida nada de esto: con ids que no existen responde 500.
    if (materia === undefined || tipo === undefined || fecha === null) {
      return throwError(() => new Error(MENSAJE_ERROR_REGISTRAR_EXAMEN));
    }

    const delDia = this.examenesDe(fecha.getFullYear(), fecha.getMonth() + 1).filter(
      (existente) => existente.fecha === examen.dia,
    );
    if (delDia.length + 1 > this.limite) {
      return throwError(() => new Error(MENSAJE_LIMITE_SUPERADO));
    }

    this.examenes.push({
      idExamen: this.siguienteIdExamen++,
      fecha: examen.dia,
      horario: examen.horario,
      materia: materia.materia,
      comision: materia.comision,
      tipo: tipo.nombre,
    });
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  reprogramarExamen(idExamen: number, fechaYHora: string): Observable<void> {
    const posicion = this.examenes.findIndex((examen) => examen.idExamen === idExamen);
    if (posicion === -1) {
      return throwError(() => new Error(MENSAJE_EXAMEN_NO_ENCONTRADO));
    }

    const coincidencia = FECHA_Y_HORA.exec(fechaYHora);
    const fecha = coincidencia === null ? null : desdeFechaSola(coincidencia[1]);
    if (coincidencia === null || fecha === null) {
      return throwError(() => new Error(MENSAJE_ERROR_REPROGRAMAR_EXAMEN));
    }
    const [, dia, horario] = coincidencia;

    // Los otros del día: el propio examen no se cuenta a sí mismo (como en el backend).
    const delDia = this.examenesDe(fecha.getFullYear(), fecha.getMonth() + 1).filter(
      (existente) => existente.fecha === dia && existente.idExamen !== idExamen,
    );
    if (delDia.length + 1 > this.limite) {
      return throwError(() => new Error(MENSAJE_LIMITE_SUPERADO_AL_REPROGRAMAR));
    }

    this.examenes[posicion] = { ...this.examenes[posicion], fecha: dia, horario };
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  eliminarExamen(idExamen: number): Observable<void> {
    const posicion = this.examenes.findIndex((examen) => examen.idExamen === idExamen);
    if (posicion === -1) {
      return throwError(() => new Error(MENSAJE_EXAMEN_NO_ENCONTRADO));
    }

    this.examenes.splice(posicion, 1);
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  /** Los parciales de un mes. Los de ejemplo caen en los mismos días de cualquier mes y se cargan al pedirlo. */
  private examenesDe(anio: number, mes: number): ExamenCalendario[] {
    const clave = `${anio}-${mes}`;
    if (!this.mesesConEjemplos.has(clave)) {
      this.mesesConEjemplos.add(clave);
      for (const { dia, ...datos } of EJEMPLOS) {
        this.examenes.push({
          idExamen: this.siguienteIdExamen++,
          fecha: aFechaSola(new Date(anio, mes - 1, dia)),
          ...datos,
        });
      }
    }

    const prefijo = aFechaSola(new Date(anio, mes - 1, 1)).slice(0, 8);
    return this.examenes.filter(({ fecha }) => fecha.startsWith(prefijo));
  }

  limiteDiario(): Observable<number> {
    return of(this.limite).pipe(delay(DEMORA_SIMULADA_MS));
  }

  guardarLimiteDiario(limite: number): Observable<void> {
    if (limite <= 0) {
      return throwError(() => new Error('El límite de parciales Diarios debe ser mayor a cero.'));
    }
    this.limite = limite;
    return of(undefined).pipe(delay(DEMORA_SIMULADA_MS));
  }

  mesasAsignadas(): Observable<MesaAsignada[]> {
    const hoy = new Date();
    const dentroDe = (dias: number, hora: number) =>
      new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, hora);

    const mesas: MesaAsignada[] = [
      { idExamen: 1, materia: 'Redes', fecha: dentroDe(7, 9) },
      { idExamen: 2, materia: 'Programación', fecha: dentroDe(14, 14) },
    ];
    return of(mesas).pipe(delay(DEMORA_SIMULADA_MS));
  }
}
