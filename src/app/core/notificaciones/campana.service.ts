import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ROLES } from '../auth/modelos/rol';
import { OpcionesPedido } from '../comun/opciones-pedido';
import { rolPrincipalDe } from '../auth/rol-principal';
import { Sesion } from '../auth/modelos/sesion';
import { JustificativosService } from '../justificativos/justificativos.service';
import { LegajoService } from '../legajos/legajo.service';
import { DocumentoRequerido } from '../legajos/modelos/documento-requerido';
import { idRolDocumental } from '../legajos/rol-documental';
import { NotificacionPanel } from './modelos/notificacion-panel';
import { NovedadesLegajo, novedadesDelLegajo } from './notificaciones-legajo';
import { novedadesPendientesDelInstituto } from './pendientes-instituto';

/**
 * La campana es accesoria y se refresca en TODAS las pantallas, incluso en las
 * que no cargan nada propio: sus pedidos no deben tapar la pantalla con el velo
 * "Cargando…". Es una opción de dominio; cómo se logra lo decide cada
 * implementación (`*-http` la traduce, `*-mock` la ignora).
 */
const EN_SEGUNDO_PLANO: OpcionesPedido = { enSegundoPlano: true };

/** A dónde llevan los avisos del legajo propio: a donde se ven y se corrigen. */
const URL_LEGAJO_PROPIO = '/legajo/mis-documentos';

interface Dependencias {
  legajos: LegajoService;
  justificativos: JustificativosService;
}

function pesoNotificacion(notificacion: NotificacionPanel): number {
  const coincidencia = notificacion.detalle?.match(/^(\d+) documentos? esperan/) ?? null;
  return coincidencia === null ? 1 : Number(coincidencia[1]);
}

/**
 * De dónde sale la campana para un rol. `null` en el observable = "no pude
 * armarla": el servicio deja lo que ya tenía en vez de pisarlo con un cero
 * mentiroso.
 */
type FuenteDeCampana = (deps: Dependencias, sesion: Sesion) => Observable<NovedadesLegajo | null>;

/** Docente y Alumno: las novedades de SU propio legajo. */
const fuenteLegajoPropio: FuenteDeCampana = ({ legajos }, sesion) => {
  const idRol = idRolDocumental(sesion);

  // Si fallan los requeridos igual se avisan los rechazos: lo único que se
  // pierde es "falta entregar X", y `novedadesDelLegajo` no declara el legajo
  // completo sin saber qué le corresponde al rol.
  const requeridos$ =
    idRol === null
      ? of<DocumentoRequerido[]>([])
      : legajos
          .documentosRequeridos(idRol, EN_SEGUNDO_PLANO)
          .pipe(catchError(() => of<DocumentoRequerido[]>([])));

  return forkJoin({ documentos: legajos.obtenerLegajoPropio(EN_SEGUNDO_PLANO), requeridos: requeridos$ }).pipe(
    map(({ documentos, requeridos }) =>
      novedadesDelLegajo(documentos, requeridos, { url: URL_LEGAJO_PROPIO }),
    ),
  );
};

/** Secretario y Director: lo que espera revisión en todo el instituto. */
const fuentePendientesDelInstituto: FuenteDeCampana = ({ legajos, justificativos }) =>
  forkJoin({
    // Cada fuente falla por separado: si cae una, la campana muestra la otra.
    justificativos: justificativos
      .listarPendientes(EN_SEGUNDO_PLANO)
      .pipe(catchError(() => of(null))),
    personas: legajos
      .obtenerResumenUsuarios(EN_SEGUNDO_PLANO)
      .pipe(catchError(() => of(null))),
  }).pipe(
    map(({ justificativos: pendientes, personas }) =>
      pendientes === null && personas === null
        ? null
        : novedadesPendientesDelInstituto(pendientes ?? [], personas ?? []),
    ),
  );

/**
 * Qué muestra la campana según el rol principal de la sesión (el mismo
 * criterio que el encabezado: `rolPrincipalDe`). Un rol que no figura acá
 * deja la campana vacía.
 *
 * Es un `Map` y no un objeto literal para que un rol llamado `constructor` o
 * `toString` no encuentre una propiedad heredada de `Object`.
 */
const FUENTE_POR_ROL: ReadonlyMap<string, FuenteDeCampana> = new Map([
  [ROLES.docente, fuenteLegajoPropio],
  [ROLES.alumno, fuenteLegajoPropio],
  [ROLES.secretario, fuentePendientesDelInstituto],
  [ROLES.director, fuentePendientesDelInstituto],
]);

interface Contenido {
  /** De quién es este contenido. `null` = de nadie (vacío inicial). */
  idUsuario: number | null;
  total: number;
  detalle: NotificacionPanel[];
}

const SIN_CONTENIDO: Contenido = { idUsuario: null, total: 0, detalle: [] };
const CLAVE_LEIDAS = 'iscgb.notificaciones.leidas';

function claveNotificacion(notificacion: NotificacionPanel): string {
  return JSON.stringify([
    notificacion.titulo,
    notificacion.detalle ?? '',
    notificacion.url ?? '',
    notificacion.tono ?? 'pendiente',
  ]);
}

function claveLeidas(idUsuario: number): string {
  return `${CLAVE_LEIDAS}.${idUsuario}`;
}

function leidasGuardadas(idUsuario: number): Set<string> {
  try {
    const valor = sessionStorage.getItem(claveLeidas(idUsuario));
    if (valor === null) {
      return new Set();
    }

    const guardadas: unknown = JSON.parse(valor);
    return Array.isArray(guardadas)
      ? new Set(guardadas.filter((item): item is string => typeof item === 'string'))
      : new Set();
  } catch (error) {
    console.error('No se pudieron recuperar las notificaciones leídas:', error);
    return new Set();
  }
}

function guardarLeidas(idUsuario: number, leidas: Set<string>): void {
  try {
    sessionStorage.setItem(claveLeidas(idUsuario), JSON.stringify([...leidas]));
  } catch (error) {
    console.error('No se pudieron guardar las notificaciones leídas:', error);
  }
}

/**
 * La campana de notificaciones de LA SESIÓN, igual en todas las pantallas.
 *
 * Antes cada pantalla calculaba la suya con sus propios datos (y 8 de las 14
 * no calculaban nada), así que el mismo usuario veía la campana encendida en
 * un lado y apagada en otro. Acá hay una sola fuente: depende de quién inició
 * sesión, no de la pantalla en la que está.
 *
 * ── Patrones ──────────────────────────────────────────────────────────────
 *   · Singleton (`providedIn: 'root'`): el estado vive acá y no se pierde al
 *     navegar, por eso la campana no parpadea a vacío entre pantallas.
 *   · Facade: compone `LegajoService` y `JustificativosService` (las clases
 *     ABSTRACTAS), así funciona igual con la implementación HTTP y con el
 *     mock. No es un dominio HTTP nuevo: no llama a ningún endpoint propio, y
 *     por eso no tiene par `*-http` / `*-mock`.
 *   · Tabla por clave: `FUENTE_POR_ROL`, con caso por defecto = campana vacía.
 *   · Observer: `total` y `detalle` son signals de solo lectura.
 *
 * ── Reglas ────────────────────────────────────────────────────────────────
 *   · Cada contenedor llama a `refrescar()` al crearse.
 *   · Mientras recarga, conserva el último valor.
 *   · Dos `refrescar()` seguidos no disparan dos cargas.
 *   · El contenido guarda de QUIÉN es: si cambia el `idUsuario` de la sesión
 *     (o se cierra), `total` y `detalle` dan vacío de inmediato, sin esperar
 *     a ningún refresco. Nunca se ven avisos de la sesión anterior.
 *   · Si la carga falla no se muestra ningún error: la campana es un elemento
 *     secundario y no debe romper la pantalla. Queda con lo que tenía.
 *
 * Con más de un rol manda el rol principal (Director > Secretario > Docente >
 * Alumno): un Director que además es Docente ve los pendientes del instituto,
 * no su propio legajo.
 */
@Injectable({ providedIn: 'root' })
export class CampanaService {
  private readonly auth = inject(AuthService, { optional: true });
  private readonly legajos = inject(LegajoService, { optional: true });
  private readonly justificativos = inject(JustificativosService, { optional: true });
  private readonly dependencias: Dependencias | null =
    this.legajos !== null && this.justificativos !== null
      ? { legajos: this.legajos, justificativos: this.justificativos }
      : null;

  private readonly contenido = signal<Contenido>(SIN_CONTENIDO);
  private readonly leidas = signal<Set<string>>(new Set());

  /** El contenido, solo si es de la sesión que está abierta AHORA. */
  private readonly vigente = computed(() => {
    const contenido = this.contenido();
    const sesion = this.auth?.sesion() ?? null;
    return sesion !== null && contenido.idUsuario === sesion.idUsuario ? contenido : SIN_CONTENIDO;
  });

  /** Cuántas novedades hay: lo que enciende el puntito rojo. */
  readonly total: Signal<number> = computed(
    () =>
      Math.max(
        0,
        this.vigente().total -
          this.vigente().detalle
            .filter((notificacion) => this.leidas().has(claveNotificacion(notificacion)))
            .reduce((total, notificacion) => total + pesoNotificacion(notificacion), 0),
      ),
  );

  /**
   * TODAS las novedades, una por una. Recortarlas para el desplegable es cosa
   * de la presentación (`EstructuraPanel`), que además las muestra completas
   * en su panel lateral.
   */
  readonly detalle: Signal<NotificacionPanel[]> = computed(() =>
    this.vigente().detalle.filter((notificacion) => !this.leidas().has(claveNotificacion(notificacion))),
  );

  private carga: Subscription | null = null;
  private cargandoPara: number | null = null;

  /**
   * Vuelve a pedir lo que muestra la campana. No devuelve nada ni lanza: se
   * llama al crear cada pantalla y no tiene nada que contestarle.
   */
  refrescar(): void {
    const sesion = this.auth?.sesion() ?? null;
    const fuente = sesion === null ? undefined : FUENTE_POR_ROL.get(rolPrincipalDe(sesion));

    if (sesion === null || fuente === undefined || this.dependencias === null) {
      this.cancelarCarga();
      this.contenido.set(SIN_CONTENIDO);
      return;
    }

    this.leidas.set(leidasGuardadas(sesion.idUsuario));
    if (this.cargandoPara === sesion.idUsuario) {
      return;
    }

    this.cancelarCarga();
    if (this.contenido().idUsuario !== sesion.idUsuario) {
      this.contenido.set(SIN_CONTENIDO);
    }

    const idUsuario = sesion.idUsuario;
    this.cargandoPara = idUsuario;

    let ultima = false;
    const suscripcion = fuente(this.dependencias, sesion)
      .pipe(
        finalize(() => {
          ultima = true;
          if (this.cargandoPara === idUsuario) {
            this.cargandoPara = null;
          }
        }),
      )
      .subscribe({
        next: (novedades) => {
          // `null` = no se pudo armar: se queda lo que había.
          if (novedades !== null && this.auth?.sesion()?.idUsuario === idUsuario) {
            this.contenido.set({ idUsuario, total: novedades.total, detalle: novedades.detalle });
          }
        },
        // Un fallo no tiene que llegar a la pantalla (ver el comentario de la clase).
        error: () => {},
      });

    // Con un observable síncrono `finalize` ya corrió: no hay nada que guardar.
    this.carga = ultima ? null : suscripcion;
  }

  /** Oculta todas las novedades actuales y las conserva durante la sesión. */
  marcarTodasComoLeidas(): void {
    const sesion = this.auth?.sesion() ?? null;
    const novedades = this.vigente().detalle;
    if (sesion === null || novedades.length === 0) {
      return;
    }

    const leidas = new Set(this.leidas());
    novedades.forEach((notificacion) => leidas.add(claveNotificacion(notificacion)));
    this.leidas.set(leidas);
    guardarLeidas(sesion.idUsuario, leidas);
  }

  marcarComoLeida(notificacion: NotificacionPanel): void {
    const sesion = this.auth?.sesion() ?? null;
    if (sesion === null) {
      return;
    }

    const leidas = new Set(this.leidas());
    leidas.add(claveNotificacion(notificacion));
    this.leidas.set(leidas);
    guardarLeidas(sesion.idUsuario, leidas);
  }

  private cancelarCarga(): void {
    this.carga?.unsubscribe();
    this.carga = null;
    this.cargandoPara = null;
  }
}
