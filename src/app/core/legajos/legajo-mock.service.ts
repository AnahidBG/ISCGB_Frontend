import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DocumentoLegajo } from './modelos/documento-legajo';
import {
  DocumentoRequerido,
  NuevoDocumentoLegajo,
} from './modelos/documento-requerido';
import { LegajoService, VeredictoLegajo } from './legajo.service';

/** Cuánto tarda el legajo falso, para ver el estado de carga en pantalla. */
const DEMORA_SIMULADA_MS = 500;

/**
 * Legajos inventados, uno por DNI de `usuarios-de-prueba.ts`.
 *
 * ⚠️ Esta clase YA NO SE USA: `app.config.ts` provee `LegajoHttpService`,
 * que pega contra la API real. Se mantiene para poder volver a datos falsos
 * cambiando una línea cuando el backend está caído y hay que seguir
 * trabajando en las pantallas — que es exactamente para lo que se inventó
 * este patrón (ver `auth.service.ts`).
 *
 * Los métodos que ESCRIBEN (subir, auditar) fallan a propósito: ver abajo.
 */
const LEGAJOS_POR_DNI: Readonly<Record<string, readonly DocumentoLegajo[]>> = {
  // Dolores Docente
  '11111111': [
    {
      id: 1,
      nombre: 'Título de Grado - Analítico',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-05-12'),
    },
    {
      id: 2,
      nombre: 'DNI Copia Actualizada',
      estado: 'Pendiente',
      fechaSubida: new Date('2026-05-10'),
    },
    {
      id: 3,
      nombre: 'Certificado de Salud',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-04-30'),
    },
    { id: 4, nombre: 'Curso TIC 2025', estado: 'Rechazado', fechaSubida: new Date('2026-05-08') },
  ],
  // Alberto Alumno
  '22222222': [
    {
      id: 5,
      nombre: 'DNI Copia Actualizada',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-03-02'),
    },
    { id: 6, nombre: 'Apto Físico', estado: 'Pendiente', fechaSubida: new Date('2026-05-15') },
  ],
  // Dora Directora y Docente
  '55555555': [
    {
      id: 7,
      nombre: 'Título de Grado - Analítico',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-02-20'),
    },
    {
      id: 8,
      nombre: 'Certificado de Salud',
      estado: 'Pendiente',
      fechaSubida: new Date('2026-05-20'),
    },
  ],
};

/** Para cualquier DNI sin legajo inventado — nadie tiene documentos cargados. */
const LEGAJO_POR_DEFECTO: readonly DocumentoLegajo[] = [];

/** Documentos de todo el instituto, pendientes de que Secretaría los revise. */
const DOCUMENTOS_PARA_REVISION: readonly DocumentoLegajo[] = [
  {
    id: 101,
    nombre: 'Certificado Pepito.pdf',
    propietario: 'Dolores Docente',
    estado: 'Aprobado',
    fechaSubida: new Date('2026-08-20'),
  },
  {
    id: 102,
    nombre: 'Titulo Profesorado.pdf',
    propietario: 'Ramiro Rearte',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-08-22'),
  },
  {
    id: 103,
    nombre: 'Curso TIC 2025.pdf',
    propietario: 'Martín Morales',
    estado: 'Rechazado',
    fechaSubida: new Date('2026-08-18'),
  },
];

/** Documentos obligatorios inventados, iguales para cualquier rol. */
const REQUERIDOS_INVENTADOS: readonly DocumentoRequerido[] = [
  { idTipoDoc: 1, nombreDocumento: 'DNI Copia Actualizada', obligatorio: true, anual: false },
  { idTipoDoc: 2, nombreDocumento: 'Título de Grado - Analítico', obligatorio: true, anual: false },
  { idTipoDoc: 3, nombreDocumento: 'Certificado de Salud', obligatorio: true, anual: true },
  { idTipoDoc: 4, nombreDocumento: 'Curso TIC 2025', obligatorio: false, anual: false },
];

/**
 * Mensaje de los métodos que escriben.
 *
 * Simular una escritura exitosa sería peor que fallar: la pantalla mostraría
 * "documento subido con éxito" y no habría ningún documento en ningún lado.
 * Esa clase de mentira es la que hace que alguien crea que una funcionalidad
 * está lista cuando no lo está. Leer datos falsos sirve para maquetar;
 * escribir datos falsos no sirve para nada.
 */
const MENSAJE_SOLO_LECTURA =
  'Estás con datos de prueba: no se puede guardar nada. Cambiá a LegajoHttpService en app.config.ts.';

@Injectable()
export class LegajoMockService extends LegajoService {
  private readonly auth = inject(AuthService);

  obtenerLegajoPropio(): Observable<DocumentoLegajo[]> {
    const dni = this.auth.sesion()?.dni ?? '';
    const documentos = LEGAJOS_POR_DNI[dni] ?? LEGAJO_POR_DEFECTO;
    return of([...documentos]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  documentosRequeridos(_idRol: number): Observable<DocumentoRequerido[]> {
    return of([...REQUERIDOS_INVENTADOS]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarParaRevision(): Observable<DocumentoLegajo[]> {
    return of([...DOCUMENTOS_PARA_REVISION]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  subirDocumento(_documento: NuevoDocumentoLegajo): Observable<void> {
    return throwError(() => new Error(MENSAJE_SOLO_LECTURA));
  }

  auditar(
    _idLegajo: number,
    _veredicto: VeredictoLegajo,
    _idUsuarioAuditor: number,
    _comentario: string | null,
  ): Observable<void> {
    return throwError(() => new Error(MENSAJE_SOLO_LECTURA));
  }
}
