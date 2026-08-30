import { Injectable, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DocumentoLegajo } from './modelos/documento-legajo';
import {
  DocumentoRequerido,
  NuevoDocumentoLegajo,
} from './modelos/documento-requerido';
import { LegajoResumenUsuario } from './modelos/legajo-resumen';
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
      fechaSubida: new Date('2026-05-12'), comentario: null, fechaVencimiento: null
    },
    {
      id: 2,
      nombre: 'DNI Copia Actualizada',
      estado: 'Pendiente',
      fechaSubida: new Date('2026-05-10'), comentario: null, fechaVencimiento: null
    },
    {
      id: 3,
      nombre: 'Certificado de Salud',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-04-30'), comentario: null, fechaVencimiento: null
    },
    { id: 4, nombre: 'Curso TIC 2025', estado: 'Rechazado', fechaSubida: new Date('2026-05-08'), comentario: null, fechaVencimiento: null },
  ],
  // Alberto Alumno
  '22222222': [
    {
      id: 5,
      nombre: 'DNI Copia Actualizada',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-03-02'), comentario: null, fechaVencimiento: null
    },
    { id: 6, nombre: 'Apto Físico', estado: 'Pendiente', fechaSubida: new Date('2026-05-15'), comentario: null, fechaVencimiento: null },
  ],
  // Dora Directora y Docente
  '55555555': [
    {
      id: 7,
      nombre: 'Título de Grado - Analítico',
      estado: 'Aprobado',
      fechaSubida: new Date('2026-02-20'), comentario: null, fechaVencimiento: null
    },
    {
      id: 8,
      nombre: 'Certificado de Salud',
      estado: 'Pendiente',
      fechaSubida: new Date('2026-05-20'), comentario: null, fechaVencimiento: null
    },
  ],
};

/** Para cualquier DNI sin legajo inventado — nadie tiene documentos cargados. */
const LEGAJO_POR_DEFECTO: readonly DocumentoLegajo[] = [];

/**
 * Resumen institucional inventado, con la misma forma que
 * `GET /api/Legajos/resumen-estado` (ya real desde el 30/08/2026). Sirve para
 * seguir viendo "Control de Legajos" con el backend caído.
 *
 * Incluye a propósito a alguien SIN documentos: el endpoint real devuelve
 * todos los usuarios, no solo los que subieron algo, y la pantalla tiene que
 * verse bien igual.
 */
const RESUMEN_INSTITUCIONAL_INVENTADO: readonly LegajoResumenUsuario[] = [
  {
    idUsuario: 5,
    nombreCompleto: 'Angel Silva',
    dni: '41833479',
    documentos: [
      { idLegajo: 3, idTipoDoc: 1, estado: 'Aprobado', rutaArchivo: 'uploads/transferencia-titulos.pdf' },
      { idLegajo: 4, idTipoDoc: 2, estado: 'Pendiente', rutaArchivo: 'uploads/doc-336.pdf' },
    ],
  },
  {
    idUsuario: 4,
    nombreCompleto: 'Ana García',
    dni: '11111111',
    documentos: [
      { idLegajo: 5, idTipoDoc: 2, estado: 'Pendiente', rutaArchivo: 'uploads/ana-titulo.pdf' },
      { idLegajo: 6, idTipoDoc: 6, estado: 'Rechazado', rutaArchivo: 'uploads/ana-cuil.pdf' },
    ],
  },
  {
    idUsuario: 2,
    nombreCompleto: 'Dolores Díaz',
    dni: '30222333',
    documentos: [
      { idLegajo: 1, idTipoDoc: 2, estado: 'Aprobado', rutaArchivo: 'uploads/ejemplo-titulo.pdf' },
      { idLegajo: 2, idTipoDoc: 1, estado: 'Pendiente', rutaArchivo: 'uploads/ejemplo-dni.pdf' },
      {
        idLegajo: 7,
        idTipoDoc: 3,
        estado: 'Rechazado',
        rutaArchivo: 'uploads/ejemplo-salud.pdf',
      },
    ],
  },
  {
    idUsuario: 4001,
    nombreCompleto: 'Alberto Ávila',
    dni: '30444555',
    documentos: [
      { idLegajo: 8, idTipoDoc: 8, estado: 'Aprobado', rutaArchivo: '/uploads/legajos/AlbertoAvila_AnaliticoSecundario_20260302.pdf' },
      { idLegajo: 9, idTipoDoc: 4, estado: null, rutaArchivo: null },
    ],
  },
  {
    // Alguien dado de alta que todavía no subió nada. El endpoint real
    // devuelve TODOS los usuarios, así que este caso existe de verdad.
    idUsuario: 7,
    nombreCompleto: 'Fernando Reyes',
    dni: '30111222',
    documentos: [],
  },
];

/**
 * Pendientes inventados, con la forma de `GET /api/Legajos/pendientes`.
 *
 * Los `id` coinciden a propósito con los `idLegajo` en estado 'Pendiente' de
 * `RESUMEN_INSTITUCIONAL_INVENTADO`: así el cruce que hace
 * `aprenderNombresDeTipos()` tiene con qué trabajar y la pantalla de prueba
 * muestra los nombres reales de los tipos de documento, igual que contra la
 * API real.
 */
const PENDIENTES_INVENTADOS: readonly DocumentoLegajo[] = [
  {
    id: 4,
    nombre: 'Título de Grado - Analítico',
    propietario: 'Angel Silva',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-08-22'), comentario: null, fechaVencimiento: null
  },
  {
    id: 5,
    nombre: 'Título de Grado - Analítico',
    propietario: 'Ana García',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-08-21'), comentario: null, fechaVencimiento: null
  },
  {
    id: 2,
    nombre: 'DNI Copia Actualizada',
    propietario: 'Dolores Díaz',
    estado: 'Pendiente',
    fechaSubida: new Date('2026-05-10'), comentario: null, fechaVencimiento: null
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

  obtenerLegajoDeUsuario(_idUsuario: number): Observable<DocumentoLegajo[]> {
    return this.obtenerLegajoPropio();
  }

  documentosRequeridos(_idRol: number): Observable<DocumentoRequerido[]> {
    return of([...REQUERIDOS_INVENTADOS]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  listarParaRevision(): Observable<DocumentoLegajo[]> {
    return of([...PENDIENTES_INVENTADOS]).pipe(delay(DEMORA_SIMULADA_MS));
  }

  obtenerResumenInstitucional(): Observable<LegajoResumenUsuario[]> {
    return of(RESUMEN_INSTITUCIONAL_INVENTADO.map((usuario) => ({ ...usuario }))).pipe(
      delay(DEMORA_SIMULADA_MS),
    );
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
