import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { destinoSegunRoles } from '../../core/auth/destino-por-rol';
import { ROLES } from '../../core/auth/modelos/rol';
import { tieneAlgunRol } from '../../core/auth/modelos/sesion';
import { ENLACES_COMUNES } from '../../shared/ui/estructura-panel/enlaces-comunes';
import { EnlacePanel, EstructuraPanel } from '../../shared/ui/estructura-panel/estructura-panel';
import { Icono, NombreIcono } from '../../shared/ui/icono/icono';

/** Lo que cada ruta le pasa a esta pantalla por `data` — ver `app.routes.ts`. */
export interface DatosProximamente {
  titulo: string;
  descripcion: string;
  /** Ej. "Sprint 3 · octubre de 2026". Sale de `docs/ISCGB-PROJECT.md` → Cronograma de Sprints. */
  disponibleDesde: string;
  icono: NombreIcono;
}

/**
 * Pantalla genérica para lo que todavía no existe.
 *
 * Milena pidió sumar al menú opciones previstas por el proyecto y el Figma
 * —Calendario, Configuración, lo que vaya saliendo— aunque el backend no
 * las sostenga todavía: "es más para que se vea", vamos a completarlas de a
 * poco. En vez de un enlace deshabilitado (que no se puede tocar ni
 * explorar) o, peor, uno que no lleva a ningún lado, cada una de esas
 * opciones apunta a ESTA pantalla con su propio texto — así la persona
 * entra, entiende qué va a haber ahí y por qué no está todavía, y tiene
 * cómo volver.
 *
 * Una sola pantalla y no una por función: son todas la misma idea ("esto va
 * a estar, todavía no") con datos distintos. Agregar una más (por ejemplo,
 * "Reconocimiento de Saberes") es una ruta nueva en `app.routes.ts` con su
 * propio `data`, no un componente nuevo.
 */
@Component({
  selector: 'app-proximamente',
  imports: [EstructuraPanel, Icono],
  templateUrl: './proximamente.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Proximamente {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly sesion = this.auth.sesion;

  /**
   * `snapshot` y no el `data` observable: cada ruta (`/calendario`,
   * `/configuracion`, la que se agregue después) es una entrada DISTINTA en
   * `app.routes.ts`, así que Angular crea una instancia nueva de este
   * componente al navegar de una a otra — no hace falta reaccionar a
   * cambios, el snapshot del momento en que se construyó ya es el correcto.
   */
  protected readonly datos = this.route.snapshot.data as DatosProximamente;

  protected readonly rolPrincipal = computed(() => this.sesion()?.roles[0] ?? '');
  protected readonly rutaPanel = computed(() => destinoSegunRoles(this.sesion()));

  /**
   * El mismo menú que vería esta persona en su propio panel, para que ir y
   * volver de "Próximamente" no le cambie el resto de las opciones bajo los
   * pies. Repite la lógica de armado que ya tiene cada panel (ver
   * `PanelDocente`, `PanelAlumno`, etc.) porque no hay todavía un lugar único
   * de donde salga: eso es una limpieza para otra tanda, no para esta.
   */
  protected readonly enlaces = computed<EnlacePanel[]>(() => {
    const sesion = this.sesion();
    const enlaces: EnlacePanel[] = [
      { etiqueta: 'Dashboard', url: destinoSegunRoles(sesion), icono: 'panel' },
    ];

    if (tieneAlgunRol(sesion, [ROLES.docente, ROLES.alumno])) {
      enlaces.push({
        etiqueta: 'Subir Documento',
        url: '/legajo/subir-documento',
        icono: 'subir',
      });
    }

    if (tieneAlgunRol(sesion, [ROLES.docente])) {
      enlaces.push({
        etiqueta: 'Entregar programa de materia',
        url: '/docente/entrega-programa',
        icono: 'legajo',
      });
    }

    enlaces.push(...ENLACES_COMUNES);
    return enlaces;
  });

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
