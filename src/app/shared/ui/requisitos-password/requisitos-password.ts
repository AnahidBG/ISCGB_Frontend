import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  EstadoRequisito,
  NivelProgresoPassword,
  estadoDelRequisito,
  evaluarPassword,
  nivelDeProgreso,
} from '../../../core/auth/password';

/** Cómo se dibuja un requisito según su estado. Una tabla, no `if`s repartidos. */
interface AparienciaRequisito {
  /** Color del texto y del ícono (el ícono hereda `currentColor`). */
  readonly texto: string;
  /** Lo que escucha un lector de pantalla además del texto del requisito. */
  readonly anuncio: string;
}

/**
 * `cumplido` va en verde oscuro (`aprobado-texto`, 6,1:1) y `falta` en rojo
 * (`rechazado`, 5,2:1): los dos llegan a AA como texto. `aprobado` a secas no.
 * `pendiente` es el gris suave de siempre: todavía no se escribió nada.
 */
const APARIENCIA_POR_ESTADO: Record<EstadoRequisito, AparienciaRequisito> = {
  cumplido: { texto: 'text-aprobado-texto', anuncio: 'cumplido' },
  falta: { texto: 'text-rechazado', anuncio: 'falta' },
  pendiente: { texto: 'text-texto-suave', anuncio: 'todavía no' },
};

/** El color de los tramos llenos de la barra: el semáforo del sistema. */
const RELLENO_POR_NIVEL: Record<NivelProgresoPassword, string> = {
  vacio: 'bg-pista',
  bajo: 'bg-rechazado',
  medio: 'bg-pendiente',
  completo: 'bg-aprobado',
};

const TRAMO_VACIO = 'bg-pista';

/**
 * La lista de requisitos de la contraseña, marcando cuáles ya se cumplen
 * mientras la persona escribe.
 *
 * Cada requisito tiene tres estados, y ninguno se distingue SOLO por el color
 * (alguien que no distingue rojo de verde también tiene que poder leerla):
 *
 *   · Pendiente (gris, círculo): todavía no se escribió nada.
 *   · Falta (rojo, ✕): ya se escribió y este no se cumple.
 *   · Cumplido (verde, ✓): se cumple.
 *
 * Arriba va la cuenta ("3/5") y una barra de tramos que se llena con el
 * semáforo del sistema: rojo si falta bastante, amarillo si falta poco y
 * verde cuando se cumple todo. La barra es progreso de la política, no una
 * medida de qué tan fuerte es la contraseña.
 *
 * Existe como componente compartido porque lo usan el alta de usuarios, el
 * cambio de contraseña y la recuperación. Y se muestra siempre, no solo cuando
 * falla: decirle a alguien qué necesita ANTES de que se equivoque es bastante
 * mejor que retarlo después.
 */
@Component({
  selector: 'app-requisitos-password',
  templateUrl: './requisitos-password.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitosPassword {
  readonly password = input<string>('');

  /** El DNI del mismo formulario, para la regla de "que no lo incluya". */
  readonly dni = input<string>('');

  /**
   * `clave` de las reglas que NO se dibujan. Por defecto ninguna.
   *
   * Sirve para las pantallas que no tienen el DNI a mano (crear contraseña
   * desde el link del mail): ahí la regla "sin-dni" daría "cumple" siempre y
   * mostrarla tildada sería mentirle a la persona. No cambia la política,
   * solo qué se muestra.
   */
  readonly omitir = input<readonly string[]>([]);

  /**
   * Marca en rojo lo que falta aunque todavía no se haya escrito nada.
   *
   * Lo prende la pantalla cuando la persona intentó enviar con la contraseña
   * vacía o incompleta: ahí sí corresponde mostrar qué falta.
   */
  readonly resaltarFaltantes = input<boolean>(false);

  protected readonly requisitos = computed(() => {
    const hayTexto = this.password().length > 0;

    return evaluarPassword(this.password(), this.dni())
      .filter((requisito) => !this.omitir().includes(requisito.clave))
      .map((requisito) => {
        const estado = estadoDelRequisito(requisito.cumple, hayTexto, this.resaltarFaltantes());
        return { ...requisito, estado, apariencia: APARIENCIA_POR_ESTADO[estado] };
      });
  });

  protected readonly cumplidos = computed(
    () => this.requisitos().filter((requisito) => requisito.estado === 'cumplido').length,
  );

  protected readonly completo = computed(
    () => this.requisitos().length > 0 && this.cumplidos() === this.requisitos().length,
  );

  /** Una clase por tramo de la barra: los primeros `cumplidos` van llenos. */
  protected readonly tramos = computed(() => {
    const total = this.requisitos().length;
    const relleno = RELLENO_POR_NIVEL[nivelDeProgreso(this.cumplidos(), total)];
    return Array.from({ length: total }, (_, posicion) =>
      posicion < this.cumplidos() ? relleno : TRAMO_VACIO,
    );
  });
}
