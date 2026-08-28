import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { RUTAS_API } from '../configuracion/api';
import { DocumentoLegajo } from './modelos/documento-legajo';
import {
  DocumentoRequerido,
  NuevoDocumentoLegajo,
} from './modelos/documento-requerido';
import {
  LegajoService,
  MENSAJE_ERROR_AUDITORIA_LEGAJO,
  MENSAJE_ERROR_LEGAJO,
  MENSAJE_ERROR_SUBIDA,
  VeredictoLegajo,
} from './legajo.service';

/** Cuánto tarda "documentos para revisión", que sigue simulado. */
const DEMORA_SIMULADA_MS = 500;

/**
 * Forma real de un elemento del legajo, tal como lo arma
 * `GetLegajosPorUsuario` (proyección con `Select`, no la entidad cruda).
 * Verificado contra el código fuente del backend el 27/08/2026.
 */
interface LegajoApi {
  idLegajo: number;
  idUsuario: number;
  tipoDocumento: string | null;
  rutaArchivo: string | null;
  fechaCarga: string;
  fechaVencimiento: string | null;
  estado: string | null;
  presentadoFisico: boolean | null;
  comentario: string | null;
  auditor: string;
}

/** Forma real de `GET /api/Legajos/requeridos-por-rol/{idRol}`. */
interface RequeridosApi {
  rol: string;
  documentos: DocumentoRequerido[];
}

/**
 * Legajos contra la API real.
 *
 * Cuatro de las cinco operaciones son reales. `listarParaRevision()` sigue
 * simulado porque el backend no tiene un endpoint que junte documentos de
 * TODO el instituto — solo puede traer los de un usuario por vez. Está
 * marcado abajo y en docs/alcance-paneles-roles.md.
 *
 * Un detalle que se repite en dos métodos: los endpoints de Legajos devuelven
 * **404 cuando no hay resultados**, no una lista vacía. Un 404 acá significa
 * "todavía no hay nada", no "algo falló", así que se traduce a `[]`. Si no se
 * hiciera, un docente sin documentos cargados vería un error en vez de su
 * legajo vacío.
 */
@Injectable()
export class LegajoHttpService extends LegajoService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  obtenerLegajoPropio(): Observable<DocumentoLegajo[]> {
    const idUsuario = this.auth.sesion()?.idUsuario;

    // Sin sesión no hay de quién pedir el legajo. No debería pasar nunca
    // (estas pantallas viven detrás de authGuard), pero mejor no reventar.
    if (idUsuario === undefined) {
      return of([]);
    }

    return this.http.get<LegajoApi[]>(RUTAS_API.legajosPorUsuario(idUsuario)).pipe(
      map((legajos) => legajos.map(aDocumentoLegajo)),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          return of([]);
        }
        console.error('Error al traer el legajo:', error);
        return throwError(() => new Error(MENSAJE_ERROR_LEGAJO));
      }),
    );
  }

  documentosRequeridos(idRol: number): Observable<DocumentoRequerido[]> {
    return this.http
      .get<RequeridosApi>(RUTAS_API.documentosRequeridosPorRol(idRol))
      .pipe(
        map((respuesta) => respuesta.documentos ?? []),
        catchError((error: HttpErrorResponse) => {
          // Un 404 acá significa "nadie configuró todavía qué documentos le
          // pedimos a este rol" — falta cargar filas en
          // roles_tipos_documentos. Es un hueco de datos, no un error.
          if (error.status === 404) {
            return of([]);
          }
          console.error('Error al traer los documentos requeridos:', error);
          return throwError(() => new Error(MENSAJE_ERROR_LEGAJO));
        }),
      );
  }

  subirDocumento(documento: NuevoDocumentoLegajo): Observable<void> {
    const cuerpo = new FormData();

    // Los nombres coinciden con `SubirLegajoDto`. ASP.NET no distingue
    // mayúsculas al enlazar el formulario.
    cuerpo.append('idUsuario', String(documento.idUsuario));
    cuerpo.append('idTipoDoc', String(documento.idTipoDoc));
    cuerpo.append('presentadoFisico', String(documento.presentadoFisico));

    if (documento.fechaVencimiento !== null) {
      cuerpo.append('fechaVencimiento', documento.fechaVencimiento.toISOString());
    }

    cuerpo.append('archivo', documento.archivo);

    // Sin `Content-Type` a propósito: el navegador lo pone solo, con el
    // `boundary` que necesita multipart. Ponerlo a mano rompe la subida.
    return this.http.post(RUTAS_API.subirLegajo, cuerpo).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al subir el documento:', error);
        return throwError(() => new Error(MENSAJE_ERROR_SUBIDA));
      }),
    );
  }

  auditar(
    idLegajo: number,
    veredicto: VeredictoLegajo,
    idUsuarioAuditor: number,
    comentario: string | null,
  ): Observable<void> {
    // El auditor va por query string y el veredicto por body: así lo definió
    // el backend (`[FromQuery] int idUsuarioAuditor, [FromBody] dto`).
    return this.http
      .put(RUTAS_API.auditarLegajo(idLegajo, idUsuarioAuditor), {
        estado: veredicto,
        comentario,
      })
      .pipe(
        map(() => undefined),
        catchError((error: HttpErrorResponse) => {
          console.error('Error al auditar el documento:', error);
          return throwError(() => new Error(MENSAJE_ERROR_AUDITORIA_LEGAJO));
        }),
      );
  }

  listarParaRevision(): Observable<DocumentoLegajo[]> {
    return of([...DOCUMENTOS_PARA_REVISION_SIMULADOS]).pipe(delay(DEMORA_SIMULADA_MS));
  }
}

function aDocumentoLegajo(legajo: LegajoApi): DocumentoLegajo {
  return {
    id: legajo.idLegajo,
    nombre: legajo.tipoDocumento ?? 'Documento sin nombre',
    estado: legajo.estado,
    fechaSubida: new Date(legajo.fechaCarga),
  };
}

/**
 * ⚠️ Datos inventados — lo único simulado que queda en esta clase.
 *
 * El backend no tiene un endpoint que liste documentos de todo el instituto.
 * Ningún panel los muestra hoy: el del Secretario pasó a mostrar
 * justificativos reales. Quedan acá para que `listarParaRevision()` siga
 * cumpliendo el contrato mientras el endpoint no exista.
 */
const DOCUMENTOS_PARA_REVISION_SIMULADOS: readonly DocumentoLegajo[] = [
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
