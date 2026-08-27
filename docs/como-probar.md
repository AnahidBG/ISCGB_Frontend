# Cómo probar el sistema, paso a paso

Última actualización: **27/08/2026**

Guía para levantar los dos sistemas y verificar que todo lo construido
funciona. El orden importa: cada paso da por hecho que el anterior salió bien.

Al final hay una tabla de **"si algo falla"** con los problemas más probables
y qué mirar en cada caso.

---

## Parte 1 — La base de datos

### 1.1 Que SQL Server esté corriendo

La cadena de conexión del backend (`appsettings.json`) apunta a:

```
Server=localhost\SQLEXPRESS;Database=Autogestion_Docente;Trusted_Connection=True
```

Comprobar que el servicio **SQL Server (SQLEXPRESS)** esté iniciado en
Windows (Servicios → SQL Server) y que exista la base `Autogestion_Docente`.

### 1.2 Cargar los datos iniciales

Abrir `ISCGB_Backend/datos-iniciales.sql` en SQL Server Management Studio o
Azure Data Studio, conectado a esa base, y **ejecutarlo entero**.

Se puede correr varias veces sin duplicar nada.

### 1.3 Verificar que quedó bien

El script termina con dos consultas. Mirá la segunda: lista quién puede
entrar y con qué rol.

**Lo que tenés que ver:** cinco filas, con Dora Duarte apareciendo dos veces
(Director y Docente).

**Lo que NO tiene que pasar:** que alguien salga con `rol` en `NULL`. Si pasa,
le falta la fila en `Usuarios_roles` y **no va a poder entrar a ningún panel**:
el login le va a responder 200 pero con `roles: []`.

---

## Parte 2 — El backend solo

Antes de tocar Angular conviene confirmar que la API anda por su cuenta. Si
algo falla acá, no tiene sentido buscar el problema en el frontend.

### 2.1 Levantarlo

```bash
cd ISCGB_Backend
dotnet run
```

Tiene que decir:

```
Now listening on: http://localhost:5231
```

**Dejalo corriendo.** Todo lo que sigue lo necesita levantado.

### 2.2 Probar el login

Abrir `http://localhost:5231/swagger` y ejecutar `POST /api/Auth/login` con:

```json
{ "dni": "30222333", "password": "iscgb2026" }
```

(También está listo en `ISCGB_Backend/pruebas-api.http`, si usás la extensión
*REST Client* de VS Code.)

**Lo importante de la respuesta NO es el token: es el campo `roles`.**

```json
{
  "token": "eyJ...",
  "usuario": "Dolores Díaz",
  "idUsuario": 5,
  "roles": [{ "idRol": 3, "nombreRol": "Docente" }]
}
```

Si `roles` viene `[]`, volvé a la parte 1.3. El resto no va a andar.

### 2.3 Probar los otros tres endpoints

| Petición | Qué tiene que devolver |
|---|---|
| `GET /api/Usuarios?pagina=1&registrosPorPagina=500` | `{ paginacion, datos: [...] }` con los 4 usuarios |
| `GET /api/Legajos/usuario/5` | Los 3 documentos de Dolores |
| `GET /api/Legajos/requeridos-por-rol/3` | Los 6 documentos que se le piden a un Docente |
| `GET /api/Justificativos/pendientes` | Los 2 justificativos de ejemplo |

> Ojo con el `5` y el `3`: son el `idUsuario` y el `idRol` **de tu base**. Los
> reales te los dijo la respuesta del login del paso anterior. Si tu base ya
> tenía datos, los números van a ser otros.

Un **404** en Legajos no es un error: significa "no hay nada todavía". El
frontend ya lo trata así.

---

## Parte 3 — El frontend

### 3.1 Levantarlo

En otra terminal, **sin cerrar la del backend**:

```bash
cd ISCGB_Frontend
npm install      # solo la primera vez, o si cambió package.json
ng serve
```

Abrir `http://localhost:4200`.

### 3.2 Iniciar sesión

| DNI | Contraseña | A dónde tiene que llevarte |
|---|---|---|
| 30222333 | iscgb2026 | `/docente/panel` |
| 30111222 | secretario2026 | `/secretario/panel` |
| 30333444 | director2026 | `/director/panel` |
| 30444555 | alumno2026 | `/alumno/panel` |

**Mientras carga tenés que ver el logo animado.** Si aparece, el interceptor
de carga está enganchado y la llamada HTTP está saliendo de verdad.

Si caés en `/inicio` en vez del panel, la sesión no trae roles → parte 1.3.

---

## Parte 4 — Qué mirar en cada pantalla

### 4.1 Panel del Docente (`30222333` / `iscgb2026`)

Es el que sigue la plantilla del dashboard de Figma.

- [ ] El saludo dice **"Hola, Dolores"** y abajo la línea gris.
- [ ] Las cuatro tarjetas muestran: Totales **3**, Aprobados **1**,
      Pendientes **1**, Rechazados **1**.
- [ ] **La campana tiene el puntito rojo.** Se enciende porque Dolores tiene
      un documento rechazado. Si no tuviera ninguno, no aparecería — no es
      decorativo.
- [ ] "Actividad Reciente" lista los tres documentos, el más nuevo primero,
      cada uno con su badge de color.
- [ ] "Próximos Pasos" muestra la línea de tiempo con los círculos unidos.
- [ ] El menú lateral tiene los cuatro ítems con íconos y "Dashboard"
      resaltado en verde.

### 4.2 El menú de la foto

- [ ] Tocar el círculo con las iniciales (**DD**) arriba a la derecha abre el
      panelito.
- [ ] Muestra nombre completo, rol y email.
- [ ] "Editar perfil" y "Cambiar foto" se ven apagados, con el motivo escrito
      abajo. Es correcto: el backend no tiene endpoint para eso.
- [ ] Se cierra tocando en cualquier otro lado, o con la tecla **Escape**.
- [ ] "Cerrar sesión" te devuelve al login.

### 4.3 Subir Documento

> ⚠️ **Si venías con la sesión abierta de antes de este cambio, cerrá sesión y
> volvé a entrar.** La sesión ahora guarda el id del rol además del nombre, y
> una sesión vieja guardada en el navegador no lo tiene: la pantalla te va a
> decir "No pudimos saber qué documentos te corresponden".

Entrar por el botón verde **"Nuevo Documento"** o por el menú lateral.

- [ ] El título dice **"Subir Documento"** (acá no saluda, es una pantalla
      que hace una cosa concreta).
- [ ] El desplegable "Tipo de Documento" trae los seis documentos del rol
      Docente, con "(opcional)" en el que no es obligatorio.
- [ ] Al elegir **Certificado de Salud** aparece el campo de fecha de
      vencimiento (es anual). Al elegir **Título de Grado** no aparece.
- [ ] Arrastrar un PDF a la caja: el borde se pone verde y después el archivo
      aparece con su nombre y tamaño.
- [ ] **Probar con un archivo que NO sea PDF** (una imagen, un Word): tiene
      que rechazarlo con un mensaje, sin subir nada. Es la regla de negocio #1.
- [ ] El botón "Subir documento" está apagado hasta que estén los tres campos.
- [ ] Al enviar, aparece la pantalla de confirmación.
- [ ] Volver al panel: **el documento nuevo está en la lista, en Pendiente**,
      y las tarjetas subieron de número. Eso confirma que se guardó de verdad
      en la base.

### 4.4 Panel del Secretario (`30111222` / `secretario2026`)

- [ ] Lista los **dos justificativos** del script, con nombre del docente,
      tipo y fecha.
- [ ] "Ver el comprobante" aparece en el primero y no en el segundo (el de
      "Causas Personales" no lleva archivo adjunto).
- [ ] **Ese enlace va a dar 404.** Es esperado: falta `app.UseStaticFiles()`
      en el backend (está en la página de Notion para Angel, punto 1.1).
- [ ] Tocar **Aprobar** en uno: desaparece de la lista y sale el cartel verde
      de confirmación.
- [ ] Tocar **Rechazar** en el otro: además del cartel, **tiene que avisar
      que el correo automático no está implementado** y que hay que notificar
      a la persona por otro medio. Ese aviso es a propósito.
- [ ] Recargar la página (F5): la lista sigue vacía. Confirma que el cambio
      se guardó en la base y no solo en pantalla.

### 4.5 Panel del Director (`30333444` / `director2026`)

- [ ] Lista los cuatro usuarios reales del instituto con sus roles.
- [ ] Dora aparece con **dos roles**.
- [ ] **La columna de estado de legajo está vacía en todas las filas.** Es
      correcto y esperado: `GET /api/Usuarios` no devuelve ese dato todavía
      (Notion, punto 1.2). Preferimos mostrar el hueco antes que inventar un
      color.
- [ ] En el menú lateral aparece **"Entregar programa de materia"**, porque
      Dora además es Docente. Con un director que no diera clase, no estaría.

---

## Si algo falla

| Lo que ves | Qué está pasando | Dónde mirar |
|---|---|---|
| El login dice "El DNI o la contraseña no son correctos" con datos correctos | El usuario no está en la base, o `estado_usuario` está en 0 | Parte 1.3 |
| Entrás bien pero caés siempre en `/inicio` | La sesión no trae roles | Parte 1.3 — falta `Usuarios_roles` |
| "No pudimos conectarnos con el servidor" | El backend no está levantado, o error de CORS | Parte 2.1. En F12 → Network, un error de CORS se ve distinto de uno de conexión |
| Errores de CORS en la consola | Los puertos no son los exactos | El backend tiene que estar en **5231** y el frontend en **4200**: la política está atada a esos dos |
| Los paneles cargan pero salen vacíos | Faltan los datos de ejemplo | Parte 1.2 — la sección 7 del script |
| "No pudimos saber qué documentos te corresponden" | Sesión vieja guardada en el navegador | Cerrar sesión y volver a entrar |
| El desplegable de tipos sale vacío | Falta `roles_tipos_documentos` para ese rol | Parte 1.2 — la sección 3 del script |
| "Ver el comprobante" da 404 | Falta `app.UseStaticFiles()` | Es un pendiente conocido del backend, no un error tuyo |
| `ng serve` no compila | Suele ser un import mal escrito después de mover archivos | El mensaje dice el archivo y la línea |

**Un truco general:** abrí siempre **F12 → Network** mientras probás. Ahí se
ve cada llamada, su código de respuesta y lo que devolvió. La mayoría de los
"no anda" se resuelven mirando si la llamada salió, y qué contestó.

---

## Lo que todavía no se puede probar

No está roto: no existe todavía.

- **Buscador de la barra superior** — está deshabilitado a propósito. No hay
  endpoint de búsqueda.
- **Editar perfil / cambiar foto** — sin endpoint ni columna en la base.
- **Revisión de legajos de todo el instituto** (Secretario) — el backend solo
  permite pedir los documentos de una persona por vez.
- **Recuperar contraseña** — la pantalla existe pero simula el envío; no manda
  ningún correo.
- **Notificaciones de verdad** — el puntito rojo se calcula en el frontend a
  partir de los documentos rechazados.
