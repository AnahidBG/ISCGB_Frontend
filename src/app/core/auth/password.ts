import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { normalizarDni } from './dni';

export const LARGO_MINIMO_PASSWORD = 8;

/**
 * Una regla de la política de contraseñas.
 *
 * `cumple` recibe también el DNI porque una de las reglas es que la
 * contraseña no lo contenga — es el dato que cualquiera probaría primero.
 */
export interface RequisitoPassword {
  clave: string;
  texto: string;
  cumple: (password: string, dni: string) => boolean;
}

/**
 * Las reglas que tiene que cumplir una contraseña.
 *
 * Están acá y no adentro de la pantalla de alta porque las va a usar también
 * "cambiar contraseña" y "recuperar contraseña" cuando existan (Sprint 3), y
 * tres listas distintas de requisitos es la forma más fácil de terminar con
 * tres políticas distintas sin que nadie se dé cuenta.
 *
 * ⚠️ Esto es UX, no seguridad: valida lo que la persona escribe en su propio
 * navegador. La validación que vale es la del backend, que hoy no existe —
 * `crear-usuario-prueba` hashea cualquier cosa, incluso una cadena vacía.
 * Está pedido en el Notion de Sprint 2.
 */
export const REQUISITOS_PASSWORD: readonly RequisitoPassword[] = [
  {
    clave: 'largo',
    texto: `Al menos ${LARGO_MINIMO_PASSWORD} caracteres`,
    cumple: (password) => password.length >= LARGO_MINIMO_PASSWORD,
  },
  {
    clave: 'mayuscula',
    texto: 'Una mayúscula',
    cumple: (password) => /[A-ZÁÉÍÓÚÑ]/.test(password),
  },
  {
    clave: 'minuscula',
    texto: 'Una minúscula',
    cumple: (password) => /[a-záéíóúñ]/.test(password),
  },
  {
    clave: 'numero',
    texto: 'Un número',
    cumple: (password) => /\d/.test(password),
  },
  {
    // Es lo primero que probaría cualquiera que tenga el DNI a mano, y en un
    // sistema donde el DNI ES el usuario, eso deja la cuenta abierta.
    clave: 'sin-dni',
    texto: 'Que no incluya el DNI',
    cumple: (password, dni) => {
      const limpio = normalizarDni(dni);
      return limpio.length < 7 || !password.includes(limpio);
    },
  },
];

/** Qué reglas cumple y cuáles no, para dibujar la lista en pantalla. */
export function evaluarPassword(
  password: string,
  dni = '',
): { clave: string; texto: string; cumple: boolean }[] {
  return REQUISITOS_PASSWORD.map((requisito) => ({
    clave: requisito.clave,
    texto: requisito.texto,
    cumple: requisito.cumple(password, dni),
  }));
}

export function passwordCumpleTodo(password: string, dni = ''): boolean {
  return REQUISITOS_PASSWORD.every((requisito) => requisito.cumple(password, dni));
}

/**
 * Validador de grupo: mira la contraseña Y el DNI del mismo formulario.
 *
 * Va en el grupo y no en el control porque una de las reglas necesita los dos
 * campos. Marca el error sobre `password`, que es donde la persona lo tiene
 * que leer.
 */
export function validadorPassword(
  campoPassword = 'password',
  campoDni = 'dni',
): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const password = grupo.get(campoPassword);
    const dni = grupo.get(campoDni);

    if (password === null) {
      return null;
    }

    const valor: string = password.value ?? '';

    // Vacío lo resuelve `Validators.required`: no hace falta gritarle dos
    // cosas distintas a alguien que todavía no escribió nada.
    if (valor === '') {
      return null;
    }

    if (passwordCumpleTodo(valor, dni?.value ?? '')) {
      quitarError(password, 'requisitos');
      return null;
    }

    password.setErrors({ ...(password.errors ?? {}), requisitos: true });
    return { requisitos: true };
  };
}

/** Saca un error puntual sin pisar los otros que pueda tener el control. */
function quitarError(control: AbstractControl, error: string): void {
  const errores = { ...(control.errors ?? {}) };
  if (!(error in errores)) {
    return;
  }

  delete errores[error];
  control.setErrors(Object.keys(errores).length === 0 ? null : errores);
}
