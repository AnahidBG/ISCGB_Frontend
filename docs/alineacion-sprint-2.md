# Alineación Sprint 2 — frontend ↔ backend ↔ Jira

**Fecha:** 03/10/2026 · **Sprint:** septiembre (01/09 – 30/09/2026)
Revisado contra: Jira (proyecto SCRUM) e `ISCGB_Backend` rama `main`
(`be92dcf` para gestión de usuarios).

El backend no se toca desde el frontend: cuando algo falta del otro lado, la
pantalla lo dice con todas las letras y queda anotado acá abajo.

---

## 1. Historias del sprint

| Historia | Front (subtarea) | Estado en el frontend | Backend que usa |
|---|---|---|---|
| **SCRUM-16** Gestión de usuarios y roles (Dirección) | SCRUM-130 | ✅ Alta, modificación, baja y reactivación; cambio de rol; CUIL/género/afiliación/provincia; director suplente; mensaje "El perfil de X ha sido actualizado correctamente"; acceso denegado con cartel; vencimiento del token verificado al navegar | `GET /api/Usuarios`, `GET /api/Usuarios/{id}`, `POST /api/UsuariosAdmin/alta`, `PUT .../modificar/{id}`, `PUT .../baja/{id}`, `PUT .../alta/{id}` |
| **SCRUM-19** Revisión y cambio de estado del legajo docente (Secretario y Dirección) | SCRUM-161 | ✅ Aprobar / rechazar por documento, motivo obligatorio al rechazar, "Presentado físicamente" visible, faltantes y progreso del revisado, filtro Docentes / Alumnos, conteos sobre la versión vigente | `GET /api/Legajos/resumen-estado`, `GET /api/Legajos/usuario/{id}`, `PUT /api/Legajos/auditar/{id}`, `GET /api/Legajos/requeridos-por-rol/{idRol}` |
| **SCRUM-7** Notificación de documentación faltante (Sistema) | SCRUM-148 | ✅ Campana con rechazos vigentes, anuales vencidos, obligatorios faltantes y "¡Tu legajo está completo!" (también como cartel). ✅ SCRUM-150 (05/10/2026): tarjeta "Documentación por entregar" arriba de todo en los paneles de Docente y Alumno, con los obligatorios sin cargar y un "Subir" en cada uno. Sale de `obligatoriosSinCargar`, igual que el aviso de la campana. Ese "Subir" y el aviso "Falta entregar X" abren Subir Documento con el tipo ya elegido (`?tipo=`, `core/legajos/tipo-en-url.ts`). Solo se elige si el tipo es de su rol; si no, el formulario abre vacío. ❌ Mail y frecuencia de avisos: son del backend | Los mismos de Legajos |
| **SCRUM-12** Certificado de alumno regular (Estudiante) | SCRUM-119 | ✅ Con y sin horario, generado por el backend con sello; enlace en el menú | `GET /api/Certificados/alumno-regular`, `.../alumno-regular-horario` |
| **SCRUM-30** Solicitar reconocimiento de saberes | SCRUM-172 | ✅ Pantalla completa (materia + comentario, 2 PDF, barra de progreso, Adjuntar/Cancelar/Enviar). ⚠️ Sin endpoint | `POST /api/ReconocimientoSaberes` (**propuesto**, ver `contrato-reconocimiento-saberes.md`) |

### Criterios que dependen del backend y NO se pueden cerrar desde el frontend

| Criterio | Historia | Qué falta |
|---|---|---|
| Rechazar dispara un mail al docente con el motivo (regla de negocio #4) | SCRUM-19 / SCRUM-7 | `IEmailService` no existe. La pantalla de revisión avisa que el mail todavía no sale. |
| Marcar la documentación presentada físicamente al revisar | SCRUM-19 (SCRUM-167/171) | `AuditoriaLegajoDto` solo recibe `estado` y `comentario`. Desde el 04/10/2026 quien sube ya no lo declara (va siempre en `false`), y lo marca quien revisa: la casilla de la revisión se puede tildar pero solo en pantalla, no se guarda hasta que el backend lo acepte. Ver `contrato-api.md`. |
| Registrar un correo para avisos, envío automático y frecuencia configurable | SCRUM-7 (SCRUM-151/155/156/157) | No hay endpoints ni job de envío (SCRUM-149 en curso). |
| Carrera / Especialidad en el perfil | SCRUM-16 | No hay columna ni campo en `CargaUsuarioDto`. |
| Horarios de cursada reales en el certificado | SCRUM-12 | El backend deja las líneas en blanco para que las complete Preceptoría. |

---

## 2. Errores del frontend corregidos en esta pasada

| Error | Dónde | Arreglo |
|---|---|---|
| Alta y edición apuntaban a `POST/PUT /api/Usuarios`, que el backend nunca implementó | `UsuariosHttpService` | Alineado a `UsuariosAdminController` |
| Con el token vencido se seguía navegando y todo fallaba con "error de conexión" | `authGuard`, nuevo `sesionInterceptor` | Se cierra la sesión y el login avisa "Tu sesión venció" |
| Acceso denegado mandaba a `/inicio`, sin menú | `roleGuard` | Vuelve al panel propio con cartel |
| La fecha de nacimiento se precargaba un día antes | Editar Usuario | `desdeFechaSola()` en hora local |
| El panel del Director mostraba la columna "Legajo" vacía para todos | `PanelDirector` | Se cruza con `resumen-estado`, que ya existía |
| Los conteos sumaban versiones viejas: un rechazo corregido seguía contando | Control de Legajos, paneles, campana | Solo la versión vigente de cada documento |
| Revisando un legajo ajeno no se veía qué le faltaba entregar | `MisDocumentos` | Se piden los requeridos del rol de esa persona |
| El certificado se armaba en el navegador sin sello; la variante con horario era "Próximamente" aunque el backend ya la tenía | `CertificadoRegular` | Se descarga del backend; se quitó `jspdf` |
| "Entregar programa" le decía "no sos docente" a todo docente | `ProgramasMateriaHttpService` | Distingue "el endpoint no existe" de "no es docente" |
| El panel del Alumno decía que los justificativos "todavía no están disponibles" | `PanelAlumno` | Texto y accesos actualizados |
| Campos de solo espacios pasaban la validación del alta | `FormularioPerfilUsuario` | Se validan después del `trim()` |

---

## 3. Pendientes para el equipo de backend

Ordenados por impacto en el Sprint 2.

1. **Contraseña del alta:** `PasswordHash = "AsignarContraseñaTemporal"` no es
   un hash BCrypt; el login de esa persona va a dar 500 (`BCrypt.Verify`
   tira excepción). Generar una contraseña inicial real.
2. **`[Authorize(Roles = ...)]`**: está comentado en `UsuariosAdminController`
   y falta en Usuarios, Legajos, Justificativos y ProgramasMateria. Hoy
   cualquiera con Postman puede crear usuarios o aprobar legajos. (Regla #5.)
3. **`GET /api/Provincias`** (y datos semilla en `Pais` / `Provincia`):
   `idProvincia` es obligatorio con clave foránea. El frontend usa una lista
   provisoria 1..24 en orden alfabético (`core/usuarios/modelos/provincia.ts`).
4. **Email al rechazar** (`IEmailService`) en `AuditarLegajo` y
   `AuditarJustificativo`. (Regla #4.)
5. **`presentadoFisico` en `AuditoriaLegajoDto`** para el check de
   documentación física (SCRUM-167/171).
6. **`GET /api/Usuarios/{id}`**: devolver CUIL, género, afiliación y
   `DirectorSuplente`. Sin el último, editar a un suplente sin volver a
   tildar la casilla le quita la suplencia.
7. **`PUT /api/UsuariosAdmin/alta/{id}`** reactiva cuentas dadas de baja.
   `PUT /api/UsuariosAdmin/modificar/{id}` también actualiza el rol enviado
   en `IdRol`.
8. **`POST /api/ReconocimientoSaberes`** — contrato en
   `contrato-reconocimiento-saberes.md`.
9. **Validar PDF por contenido** (magic bytes `%PDF-`) en Legajos y
    Justificativos (hoy solo `ContentType` o nada). (Regla #1.)
10. **Sello del certificado (verificar):** `GeneradorPDFCertificado` lo busca
    en `AppContext.BaseDirectory/wwwroot/images/sello.png` — la carpeta
    `bin/` —, pero el archivo está en `wwwRoot/Images/sello.png` del proyecto
    y el `.csproj` no lo copia a la salida. Si el certificado responde 500,
    es esto. Además, en Linux/Docker las mayúsculas (`wwwRoot`, `Images`)
    no coinciden.
11. `POST /api/Auth/crear-usuario-prueba` sigue expuesto sin autenticación.

---

## 4. Cómo probarlo

```bash
npm install
npm test          # 137 tests
npm start         # http://localhost:4200, contra http://localhost:5231
```

Con el backend de `main`: login, paneles, Control de Legajos, revisión,
certificados, notificaciones y gestión de usuarios funcionan de punta a
punta. Reconocimiento de saberes
necesita el endpoint nuevo — sin ellos, las pantallas avisan que el
servidor todavía no lo tiene habilitado.
