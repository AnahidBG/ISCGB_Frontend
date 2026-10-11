import {
  Directive,
  EmbeddedViewRef,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { tieneAlgunRol } from '../../../core/auth/modelos/sesion';

/**
 * Directiva estructural que muestra su contenido solo si la sesión actual tiene
 * alguno de los roles indicados.
 *
 *     <a *siRol="'Docente'">…</a>
 *     <a *siRol="['Secretario', 'Director']">…</a>
 *
 * Alcanza con tener UNO de los roles de la lista, igual que `roleGuard`, y reusa
 * la misma regla (`tieneAlgunRol`). Sin sesión no muestra nada. Reacciona si la
 * sesión cambia (inicio o cierre de sesión): el contenido aparece y desaparece
 * sin recrear el componente.
 *
 * Los nombres de rol salen de `ROLES` (`core/auth/modelos/rol.ts`).
 *
 * ⚠️ Esto NO es seguridad, igual que `roleGuard`: ocultar un enlace en el
 * navegador no protege nada. La protección de verdad va en el backend.
 */
@Directive({ selector: '[siRol]' })
export class SiRol {
  private readonly auth = inject(AuthService);
  private readonly plantilla = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly contenedor = inject(ViewContainerRef);

  /** Un rol o una lista de roles. Con una lista vacía no se muestra a nadie. */
  readonly siRol = input.required<string | readonly string[]>();

  /** La vista del contenido mientras está en pantalla, o `null`. */
  private vista: EmbeddedViewRef<unknown> | null = null;

  constructor() {
    effect(() => {
      const roles = this.siRol();
      const permitidos = typeof roles === 'string' ? [roles] : roles;
      const mostrar = tieneAlgunRol(this.auth.sesion(), permitidos);

      if (mostrar && this.vista === null) {
        this.vista = this.contenedor.createEmbeddedView(this.plantilla);
      } else if (!mostrar && this.vista !== null) {
        this.contenedor.clear();
        this.vista = null;
      }
    });
  }
}
