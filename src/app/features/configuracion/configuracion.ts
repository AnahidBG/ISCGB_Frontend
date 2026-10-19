import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { rolPrincipalDe } from '../../core/auth/rol-principal';
import { CampanaService } from '../../core/notificaciones/campana.service';
import { destinoSegunRoles } from '../../core/auth/destino-por-rol';
import { enlacesPorSesion } from '../../shared/ui/estructura-panel/enlaces-por-rol';
import { EstructuraPanel } from '../../shared/ui/estructura-panel/estructura-panel';
import { RequisitosPassword } from '../../shared/ui/requisitos-password/requisitos-password';
import { passwordCumpleTodo } from '../../core/auth/password';
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [ReactiveFormsModule, EstructuraPanel, RequisitosPassword],
  templateUrl: './configuracion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuracion {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly campana = inject(CampanaService);
  private readonly router = inject(Router);

  protected readonly cargando = signal<boolean>(false);
  protected readonly exito = signal<boolean>(false);

  protected readonly sesion = this.auth.sesion;
  protected readonly rolPrincipal = computed(() => rolPrincipalDe(this.sesion()));
  protected readonly notificaciones = this.campana.total;
  protected readonly notificacionesDetalle = this.campana.detalle;
  protected readonly rutaPanel = computed(() => destinoSegunRoles(this.sesion()));
  protected readonly enlaces = computed(() => enlacesPorSesion(this.sesion()));

  // Obtenemos el DNI del usuario logueado para que valide la regla 'sin-dni'
  protected readonly dniUsuario = computed(() => this.sesion()?.dni || '');

  constructor() {
    this.campana.refrescar();
  }

  // Validador custom para ver si cumple todos los requisitos (incluyendo el DNI)
  private validarNuevaPassword(control: AbstractControl) {
    const val = control.value || '';
    if (!val) return null;
    return passwordCumpleTodo(val, this.dniUsuario()) ? null : { requisitos: true };
  }

  protected readonly form = this.fb.group({
    passwordActual: ['', [Validators.required]],
    nuevaPassword: ['', [Validators.required, (c: AbstractControl) => this.validarNuevaPassword(c)]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: (group) => {
      const pass = group.get('nuevaPassword')?.value;
      const confirm = group.get('confirmPassword')?.value;
      if (!pass || !confirm) return null;
      return pass === confirm ? null : { noCoinciden: true };
    }
  });

  // Simulación local mientras no esté el endpoint en el backend
  private simularCambioPassword() {
    return of(true).pipe(delay(800));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);

    this.simularCambioPassword().subscribe({
      next: () => {
        this.cargando.set(false);
        this.exito.set(true);
      }
    });
  }

  protected cancelar(): void {
    // Resetea el formulario y te devuelve al panel principal del rol del usuario
    this.form.reset();
    this.router.navigate([this.rutaPanel()]);
  }

  protected resetearFormulario(): void {
    this.exito.set(false);
    this.form.reset();
  }

  protected cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigate(['/login']);
  }
}