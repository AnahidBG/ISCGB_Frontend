import { ParamMap } from '@angular/router';
import { DocumentoRequerido } from './modelos/documento-requerido';

/**
 * El query param con el que se abre "Subir Documento" con un tipo ya elegido:
 * `/legajo/subir-documento?tipo=7`.
 *
 * El nombre vive solo acá: quien arma el enlace usa `consultaConTipo` y quien
 * lo lee usa `tipoPedidoEn`, así que nunca se desincronizan.
 */
const PARAMETRO_TIPO = 'tipo';

/** Solo dígitos: `"7"` sí; `"7.5"`, `"-7"`, `" 7"` o `"7abc"` no. */
const ID_VALIDO = /^\d+$/;

/** Los `queryParams` del enlace a "Subir Documento" con este tipo elegido. */
export function consultaConTipo(idTipoDoc: number): Record<string, string> {
  return { [PARAMETRO_TIPO]: String(idTipoDoc) };
}

/**
 * El tipo que pide la URL, solo si está entre los que esta persona puede
 * subir. Si no, `null`, y el formulario queda sin tipo elegido, como siempre.
 *
 * La URL la puede escribir cualquiera, o puede venir de un enlace viejo. Por
 * eso no se confía en ella: solo elige un tipo que ya está en la lista.
 */
export function tipoPedidoEn(
  consulta: ParamMap,
  tipos: readonly DocumentoRequerido[],
): number | null {
  const valor = consulta.get(PARAMETRO_TIPO);
  if (valor === null || !ID_VALIDO.test(valor)) {
    return null;
  }

  const idTipoDoc = Number(valor);
  return tipos.some((tipo) => tipo.idTipoDoc === idTipoDoc) ? idTipoDoc : null;
}
