import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ContratosService } from './contratos.service';
import { ContratoAlumno, NuevoContrato } from './modelos/contrato-alumno';

/** Cuánto tarda la respuesta falsa, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 400;

interface ContratoGuardado {
  idUsuario: number;
  contrato: ContratoAlumno;
  archivo: Blob;
}

/**
 * Los contratos, en memoria. Es el que provee `app.config.ts` mientras el
 * backend no tenga los endpoints (ver `ContratosService`).
 *
 * Arranca vacío a propósito, para no mostrarle a ningún alumno un contrato que
 * no existe. Lo que carga Secretaría lo ve el alumno de la sesión mientras no se
 * recargue la página.
 */
@Injectable()
export class ContratosMockService extends ContratosService {
  private readonly auth = inject(AuthService);

  private guardados: ContratoGuardado[] = [];
  private siguienteId = 1;

  cargar(contrato: NuevoContrato): Observable<string> {
    this.guardados.push({
      idUsuario: contrato.idUsuario,
      contrato: { idContrato: this.siguienteId++, nombre: contrato.nombre, fechaCarga: new Date() },
      archivo: contrato.archivo,
    });
    return of('Contrato cargado.').pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarDeAlumno(idUsuario: number): Observable<ContratoAlumno[]> {
    return of(this.de(idUsuario)).pipe(delay(DEMORA_SIMULADA_MS));
  }

  misContratos(): Observable<ContratoAlumno[]> {
    const idUsuario = this.auth.sesion()?.idUsuario;
    return of(idUsuario === undefined ? [] : this.de(idUsuario)).pipe(delay(DEMORA_SIMULADA_MS));
  }

  descargar(idContrato: number): Observable<Blob> {
    const guardado = this.guardados.find((g) => g.contrato.idContrato === idContrato);
    return guardado === undefined
      ? throwError(() => new Error('No se encontró el contrato.'))
      : of(guardado.archivo);
  }

  /** Los de una persona, del más nuevo al más viejo. */
  private de(idUsuario: number): ContratoAlumno[] {
    return this.guardados
      .filter((g) => g.idUsuario === idUsuario)
      .map((g) => g.contrato)
      .reverse();
  }
}
