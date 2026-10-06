# Alcance de la pantalla de Login

Fecha de análisis: **04/10/2026** · Sprint 1

Este documento explica **por qué la pantalla implementada no es idéntica al
diseño de Figma**. No es un olvido: es una decisión tomada con criterio.

## El triage de 3 preguntas

Antes de construir cualquier elemento de una pantalla se le hacen tres
preguntas:

1. ¿Está en algún sprint del roadmap? → `docs/ISCGB-PROJECT.md`
2. ¿Existe el endpoint? → colección de Postman del QA
3. ¿Existe la tabla o el campo en la base? → script SQL

| Resultado | Qué se hace |
|---|---|
| Las tres en ✅ | **Construir** |
| Está en sprint pero falta backend | **Maquetar con datos falsos** |
| No está en ningún sprint | **Archivar** en Figma, no construir |

> Archivar no es borrar. El diseño se guarda en una página "Backlog" del
> archivo de Figma para una versión futura.

## Resultado aplicado al Login

| Elemento | Sprint | API | Base | Decisión |
|---|:---:|:---:|:---:|---|
| Campo DNI | ✅ | ✅ | ✅ | Construido |
| Campo Contraseña | ✅ | ✅ | ✅ | Construido |
| Botón Iniciar Sesión | ✅ | ✅ | ✅ | Construido |
| Mostrar/ocultar contraseña | ✅ | — | — | Construido (es solo frontend) |
| Panel izquierdo | ✅ | — | — | Construido |
| Mensajes de error | ✅ | ✅ | — | Construido |
| ¿Olvidaste tu contraseña? | Sprint 3 | ❌ | ✅ | **Visible pero deshabilitado** |
| Selector "Cambiar perfil" | ⚠️ | ❌ | ✅ | **Fuera del v1 — ver abajo** |
| Solicitar acceso | ❌ | ❌ | ❌ | **Fuera del MVP** |

## Detalle de lo que quedó afuera

### Solicitar acceso — fuera del MVP

No hay endpoint, no hay tabla de solicitudes y no figura en ningún sprint.
En el MVP los usuarios los da de alta Dirección (Sprint 2, "Gestión de
usuarios y roles"). El diseño queda archivado en Figma.

### ¿Olvidaste tu contraseña? — Sprint 3

La base ya tiene `Usuarios.token_recuperacion` y `expiracion_token`, pero
falta el endpoint. En el roadmap, "Cambio de contraseña" está en Sprint 3.
Se deja el botón visible y `disabled`, para no cambiar la composición visual
cuando se active.

### Selector de perfil — pendiente de decisión

El diseño tiene un chip de perfil y un enlace "← Cambiar perfil", lo que
implica una pantalla previa de selección. Pero `POST /api/Auth/login` solo
acepta `{ dni, password }`: el rol lo decide el backend.

**Esto no es un error del diseño — es más avanzado que la API.** La base de
datos tiene `Usuarios_roles` como relación muchos-a-muchos y
`Docentes.director_suplente`, o sea que una persona puede tener varios roles.
El selector de perfil sería exactamente la forma de resolverlo. Por ahora el
frontend decide el destino usando la lista de roles que devuelve el login.

### Por qué se sacó del v1

Se llegó a dibujar y después se quitó. Dejarlo tenía tres problemas:

1. **El chip mentía.** Estaba escrito a mano con el texto "Director", así que
   le decía "Director" a cualquiera que entrara, incluido un alumno.
2. **El enlace no llevaba a ningún lado.** No existe la pantalla de selección
   de perfil. Un botón que no hace nada es peor que no tener botón: el usuario
   lo aprieta, no pasa nada, y concluye que el sistema está roto.
3. **La API no recibe un rol.** `POST /api/Auth/login` solo acepta
   `{ dni, password }`, pero desde el backend actualizado devuelve `roles`
   con los roles asignados a la persona. No hace falta seleccionar un rol para
   autenticar; la pantalla envía a la persona a su panel según esa lista.

En el HTML de `formulario-login.html` quedó un comentario explicando dónde iba
y por qué no está, para que nadie lo vuelva a agregar sin darse cuenta del
problema.

### Qué hace falta para que vuelva

Pendiente de definir con el equipo:

- ¿Se necesita una selección explícita cuando una persona tiene varios roles?
- Si alguien es Docente **y** Director suplente, ¿debe existir un destino
  preferido distinto del panel del primer rol?

El backend ya devuelve los roles del usuario. La pantalla de selección queda
pendiente de una decisión funcional: hoy el destino se resuelve con la tabla
`destinoSegunRoles` y los guards permiten cualquier rol asignado.

## Detalles de implementación que vienen del análisis

| Detalle | Por qué |
|---|---|
| El DNI se manda sin puntos | El diseño muestra `43.813.379`; la API espera `43880335`. Lo limpia `normalizarDni()`. |
| Un solo mensaje de error | La API distingue "contraseña incorrecta" de "DNI no encontrado", lo que permitiría averiguar qué DNIs existen. El frontend no reenvía esa distinción. |
| La sesión va en `sessionStorage` | Se borra al cerrar la pestaña. En computadoras compartidas evita que el siguiente entre con la sesión del anterior. |

## Pendientes con el equipo de backend

1. **Ruta de login verificada** — el backend actual (commit `c048908`, PR #25)
   conserva `[HttpPost("login")]` en `AuthController.Login`. El frontend usa
   `POST /api/Auth/login`; no debe cambiarse a `POST /api/Auth`.
2. **`POST /api/Auth/crear-usuario-prueba`** — crea usuarios sin
   autenticación. No puede llegar a producción.
3. **Mensajes de error 401** — unificar en uno genérico.
4. **`GET /weatherforecast`** — endpoint de ejemplo de la plantilla de
   ASP.NET Core, todavía expuesto.
5. **`dni` es `varchar`** — acepta `"Lucas23"`. Ya detectado por el QA.
