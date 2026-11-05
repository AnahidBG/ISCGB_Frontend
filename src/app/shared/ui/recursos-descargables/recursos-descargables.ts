import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  PerfilRecursos,
  RECURSOS_POR_PERFIL,
  TipoRecurso,
} from '../../../core/configuracion/enlaces-externos';
import { Icono, NombreIcono } from '../icono/icono';

/** Tabla por clave: el ícono de cada tipo de material. */
const ICONO_POR_TIPO: Readonly<Record<TipoRecurso, NombreIcono>> = {
  documentacion: 'documento',
  tutorial: 'informacion',
};

/** Tabla por clave: lo que dice el cartel de cada tipo de material. */
const ETIQUETA_POR_TIPO: Readonly<Record<TipoRecurso, string>> = {
  documentacion: 'Documentación',
  tutorial: 'Tutorial',
};

/** Tabla por clave: lo que dice la tarjeta cuando el cliente todavía no entregó el material. */
const VACIO_POR_TIPO: Readonly<Record<TipoRecurso, string>> = {
  documentacion: 'No hay documentación cargada.',
  tutorial: 'No hay tutoriales cargados.',
};

/** Título y bajada de la sección según qué se muestre. `null` = todo junto. */
const ENCABEZADO_POR_TIPO: Readonly<
  Record<TipoRecurso | 'todo', { titulo: string; descripcion: string }>
> = {
  documentacion: {
    titulo: 'Documentación para descargar',
    descripcion: 'Formatos y enlaces del instituto para descargar y completar.',
  },
  tutorial: {
    titulo: 'Tutoriales',
    descripcion: 'Guías para usar las herramientas del instituto.',
  },
  todo: {
    titulo: 'Documentación y tutoriales',
    descripcion: 'Material del instituto para descargar y consultar.',
  },
};

/**
 * Documentación para descargar y tutoriales del alumno y del docente
 * (SCRUM-228, SCRUM-229, SCRUM-230 y SCRUM-231).
 *
 * Presentacional: recibe el perfil (y, si hace falta, qué tipo de material) y
 * dibuja lo que corresponde; la lista vive en `RECURSOS_POR_PERFIL`. La
 * documentación se ve desde "Mi perfil" y los tutoriales desde el Inicio de cada
 * rol. Cada material es una carpeta de Google Drive que abre en otra pestaña. Si
 * todavía no hay nada cargado (`enlace` nulo) avisa en lugar de dejar un enlace
 * roto.
 */
@Component({
  selector: 'app-recursos-descargables',
  imports: [Icono],
  templateUrl: './recursos-descargables.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecursosDescargables {
  /** Quién mira: define qué materiales aparecen. */
  readonly perfil = input.required<PerfilRecursos>();

  /** Mostrar solo documentación o solo tutoriales. Sin valor, muestra los dos. */
  readonly tipo = input<TipoRecurso | null>(null);

  protected readonly recursos = computed(() =>
    RECURSOS_POR_PERFIL[this.perfil()].filter((r) => this.tipo() === null || r.tipo === this.tipo()),
  );

  protected readonly encabezado = computed(() => ENCABEZADO_POR_TIPO[this.tipo() ?? 'todo']);

  protected iconoDe(tipo: TipoRecurso): NombreIcono {
    return ICONO_POR_TIPO[tipo];
  }

  protected etiquetaDe(tipo: TipoRecurso): string {
    return ETIQUETA_POR_TIPO[tipo];
  }

  protected vacioDe(tipo: TipoRecurso): string {
    return VACIO_POR_TIPO[tipo];
  }
}
