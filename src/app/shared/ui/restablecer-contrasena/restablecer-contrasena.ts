import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RequisitosPassword } from '../requisitos-password/requisitos-password';
import { passwordCumpleTodo } from '../../../core/auth/password';
//Hay que modificar esto cuando creemos los endpoints (import { AuthService } from '../../../core/auth/auth.service';): 
import { of } from 'rxjs';
import { delay } from 'rxjs/operators';

@Component({
  selector: 'app-restablecer-contrasena',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, RequisitosPassword],
  templateUrl: './restablecer-contrasena.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestablecerContrasena {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly cargando = signal<boolean>(false);
  protected readonly exito = signal<boolean>(false);
  private readonly token = this.route.snapshot.queryParams['token'] || '';

  private validarPasswordControl(control: AbstractControl) {
    const val = control.value || '';
    if (!val) return null;
    return passwordCumpleTodo(val, '') ? null : { requisitos: true };
  }

  protected readonly form = this.fb.group({
    password: ['', [Validators.required, (c: AbstractControl) => this.validarPasswordControl(c)]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: (group) => {
      const pass = group.get('password')?.value;
      const confirm = group.get('confirmPassword')?.value;
      return pass === confirm ? null : { noCoinciden: true };
    }
  });

  // Simula la llamada a la API con un retardo de 800ms
  private simularApiRestablecer() {
    return of(true).pipe(delay(800));
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    this.cargando.set(true);

    this.simularApiRestablecer().subscribe({
      next: () => {
        this.cargando.set(false);
        this.exito.set(true); // Cambia a la tarjeta de éxito

        // Espera 3 segundos y redirige al login
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      }
    });
  }
}