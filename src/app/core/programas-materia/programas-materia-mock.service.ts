import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { ContextoDocente } from './modelos/contexto-docente';
import { ProgramaMateria } from './modelos/programa-materia';
import { ProgramasMateriaService } from './programas-materia.service';

/**
 * Materias inventadas para poder probar el desplegable sin backend. Dos
 * comparten nombre a propósito ("Práctica Docente"): es el caso que hace
 * falta que la carrera y el curso se vean en la etiqueta.
 */
const CONTEXTO_DOCENTE_INVENTADO: ContextoDocente = {
  idDocente: 1,
  materias: [
    { idMateria: 3, nombre: 'Didáctica General', carrera: 'Profesorado de Primaria', curso: '2°' },
    { idMateria: 7, nombre: 'Práctica Docente', carrera: 'Profesorado de Primaria', curso: '3°' },
    { idMateria: 9, nombre: 'Práctica Docente', carrera: 'Profesorado de Inicial', curso: '3°' },
    { idMateria: 12, nombre: 'Psicología Educacional', carrera: null, curso: null },
  ],
};

/** Cuánto tarda el envío falso, para ver el estado "enviando" del botón. */
const DEMORA_SIMULADA_MS = 900;

/** Cuánto tarda la generación falsa del PDF. */
const DEMORA_SIMULADA_PDF_MS = 600;

/** ID inventado que devuelve el mock, para que el flujo del PDF pueda seguir. */
const ID_PROGRAMA_SIMULADO = 1;

/**
 * Envío simulado del programa de materia.
 *
 * No toca la red: registra el programa en la consola y devuelve éxito.
 * Sirve para maquetar y probar la pantalla completa (incluidas las unidades
 * dinámicas y la descarga del PDF) sin depender de que el backend esté
 * levantado.
 *
 * Se cambia por `ProgramasMateriaHttpService` con una línea en `app.config.ts`,
 * igual que con `AuthService`.
 */
@Injectable()
export class ProgramasMateriaMockService extends ProgramasMateriaService {
  obtenerContextoDocente(idUsuario: number): Observable<ContextoDocente | null> {
    console.info('[mock] Se pediría el contexto del docente del usuario:', idUsuario);
    return of(CONTEXTO_DOCENTE_INVENTADO).pipe(delay(DEMORA_SIMULADA_MS));
  }

  enviarPrograma(programa: ProgramaMateria): Observable<number> {
    console.info('[mock] Programa de materia que se enviaría a la API:', programa);
    return of(ID_PROGRAMA_SIMULADO).pipe(delay(DEMORA_SIMULADA_MS));
  }

  descargarPdf(idPrograma: number): Observable<Blob> {
    console.info('[mock] Se pediría el PDF del programa:', idPrograma);

    // ⚠️ Esto NO es un PDF válido: es texto plano con el tipo MIME de un PDF.
    // Alcanza para probar que la descarga se dispara y que el archivo llega
    // con el nombre correcto, que es lo que este mock tiene que verificar.
    // Un visor de PDF no va a poder abrirlo, y está bien que así sea: si
    // abriera, no sabrías si estás viendo el mock o la API de verdad.
    const contenido = `PDF simulado del programa ${idPrograma} — generado por el mock.`;
    const archivo = new Blob([contenido], { type: 'application/pdf' });

    return of(archivo).pipe(delay(DEMORA_SIMULADA_PDF_MS));
  }
}
