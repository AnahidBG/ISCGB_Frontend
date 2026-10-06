# Alcance de la pantalla de login

Analizado el **04/10/2026**, Sprint 1. Explica por qué la pantalla que se
construyó no es idéntica al diseño de Figma. No es un olvido: se decidió así.

## Las tres preguntas

Antes de construir cualquier elemento de una pantalla se le hacen tres
preguntas:

1. ¿Está en algún sprint del roadmap? Se mira en `docs/ISCGB-PROJECT.md`.
2. ¿Existe el endpoint? Se mira en el controlador real del backend.
3. ¿Existe la tabla o el campo en la base? Se mira en el script SQL.

Si las tres dan que sí, se construye. Si está en un sprint pero falta el
backend, se maqueta con datos falsos. Si no está en ningún sprint, se archiva
en la página "Backlog" de Figma y no se construye. Archivar no es borrar.

## Cómo quedó el login

Se construyó lo que pasa las tres preguntas: el campo DNI, el de contraseña, el
botón Iniciar Sesión y los mensajes de error. También el panel izquierdo y el
botón para mostrar u ocultar la contraseña, que son solo frontend.

Tres elementos del diseño quedaron distintos.

### Solicitar acceso: fuera del MVP

No hay endpoint ni tabla de solicitudes, y no figura en ningún sprint. En el
MVP los usuarios los da de alta Dirección. El diseño queda archivado en Figma.

### ¿Olvidaste tu contraseña?: pantalla provisoria

La base ya tiene `Usuarios.token_recuperacion` y `expiracion_token`, pero falta
el endpoint, y el cambio de contraseña está en el Sprint 3. El enlace lleva a
`/recuperar-contrasena`, una pantalla provisoria que no manda ningún correo.

### Selector de perfil: pendiente de decisión

El diseño tiene un chip de perfil y un enlace "← Cambiar perfil", lo que supone
una pantalla previa para elegir el rol. Pero `POST /api/Auth/login` solo acepta
`{ dni, password }`: el rol lo decide el backend.

El diseño no está mal, va más adelante que la API. La base tiene
`Usuarios_roles` como relación de muchos a muchos y `Docentes.director_suplente`,
así que una persona puede tener varios roles, y un selector sería la forma de
resolverlo.

Se llegó a dibujar y después se quitó, por tres motivos:

1. El chip mentía. Tenía escrito "Director" a mano y se lo decía a cualquiera
   que entrara, incluido un alumno.
2. El enlace no llevaba a ningún lado, porque la pantalla de selección no
   existe. Un botón que no hace nada es peor que no tenerlo: la persona lo
   aprieta, no pasa nada y concluye que el sistema está roto.
3. No hace falta elegir un rol para autenticarse. El login devuelve `roles` con
   los roles de la persona, y la pantalla la manda a su panel según esa lista.

En `formulario-login.html` quedó un comentario que dice dónde iba y por qué no
está.

Para que vuelva hay que definir dos cosas con el equipo: si hace falta una
selección explícita cuando alguien tiene varios roles, y si una persona que es
Docente y Director suplente debería tener un destino preferido. Hoy el destino
se resuelve con `destinoSegunRoles` y los guards dejan pasar cualquier rol
asignado.

## Detalles que salieron del análisis

El DNI se manda sin puntos. El diseño lo muestra como `12.345.678` y la API
espera solo dígitos; lo limpia `normalizarDni()`.

Hay un solo mensaje de error. La API distingue "contraseña incorrecta" de "DNI
no encontrado", y eso permitiría averiguar qué DNI existen. El frontend no
reenvía esa distinción.

La sesión va en `sessionStorage`, que se borra al cerrar la pestaña. En una
computadora compartida evita que el siguiente entre con la sesión del anterior.

## Pendientes del backend

Revisados contra `main` del backend el 06/10/2026.

1. `POST /api/Auth/crear-usuario-prueba` crea usuarios sin autenticación. No
   puede llegar a producción.
2. Los mensajes del 401 siguen siendo tres distintos. Conviene unificarlos en
   uno genérico.
3. `dni` es `varchar` y acepta `"Lucas23"`. Ya lo detectó QA.

La ruta del login es `POST /api/Auth/login`, y no `POST /api/Auth`: el
controlador conserva `[HttpPost("login")]`.
