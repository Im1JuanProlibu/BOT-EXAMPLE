# Fanalca — Bot Login + Editor de Propuestas

SPA embebible en la plataforma Prolibu para Fanalca. Combina una pantalla de login con el editor de propuestas en una sola vista: el usuario inicia sesión y la pantalla transiciona directamente al editor sin recargar la página.

---

## Archivos

| Archivo | Función |
|---------|---------|
| `fanalca-login-bot.html` | SPA completa (login + editor de propuestas) |
| `loader-fanalca.js` | Loader que inyecta el bot en la plataforma |

---

## Lo que va en el editor de Prolibu

Una sola vez, nunca más se toca:

```html
<div id="bot-fanalca-login">Cargando...</div>
<script src="https://Im1JuanProlibu.github.io/BOT-EXAMPLE/loader-fanalca.js"></script>
```

---

## Flujo de la SPA

```
Pantalla de login
    └── Usuario ingresa email + password
            └── POST https://customer-design.prolibu.com/v1/user/login
                    └── Extrae token del response
                        └── Transición → Editor de propuestas
                                ├── Si el usuario logueado está en la lista de asesores
                                │   → se auto-selecciona en el Step 1
                                └── GET /v1/proposal?createdBy={agentId}
                                        └── Muestra propuestas Ready + Draft
                                                └── Editor: cambia estado, productos
                                                        └── PUT /v1/proposal/{id}
                                                                └── Muestra URL de la propuesta
```

---

## Configuración del bot

```js
var domain      = 'customer-design.prolibu.com';
var rolesString = 'agent';
```

> El `bearerToken` **no está hardcodeado** — se obtiene dinámicamente del login. Esto es la diferencia clave con los otros bots.

---

## Endpoint de login

```
POST https://customer-design.prolibu.com/v1/user/login
Content-Type: application/json

{
  "email": "usuario@fanalca.com",
  "password": "contraseña"
}
```

**Extracción del token** (maneja múltiples formatos de respuesta):
```js
var data  = res.data || res;
var token = data.token || data.accessToken || data.access_token || data.jwt || '';
var user  = data.user || data.userData || data.profile || { email };
```

> Si el login devuelve 200 pero no se muestra el editor, revisar en `console.log('Login response:', res)` qué campo trae el token y ajustar la extracción.

---

## Auto-selección del asesor

Si el email del usuario logueado coincide con un asesor en la lista, se auto-selecciona en el Step 1:

```js
var match = flAgentsList.find(function (a) { return a.email === flCurrentUser.email; });
if (match) $('#fl-agent-select').val(match.email).trigger('change');
```

Esto permite que el asesor vea directamente sus propuestas sin tener que seleccionarse manualmente.

---

## APIs que usa

| Método | Endpoint | Auth | Para qué |
|--------|----------|------|----------|
| POST | `/v1/user/login` | Sin auth | Autenticación |
| GET | `/v1/publicservices/getAgents` | Sin auth | Lista de asesores |
| GET | `/v1/proposal?createdBy={agentId}&limit=200` | Token del login | Propuestas del asesor |
| GET | `/v1/proposal/{id}` | Token del login | Detalle de propuesta |
| PUT | `/v1/proposal/{id}` | Token del login | Guardar cambios |
| GET | `/v1/product?disabled=false` | Token del login | Catálogo de productos |

---

## Diseño

- Color de acento: `#e84c1e` (naranja Fanalca)
- Fondo: `#07070f` (dark)
- Fuente: Inter
- Login: tarjeta centrada, pantalla completa
- Header post-login: nombre del usuario + botón de cerrar sesión
- Steps: 3 pasos (Asesor → Propuesta → Editar) con líneas que se colorean al avanzar

---

## Debug

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| "No se recibió token" | El campo del token no coincide | Ver `console.log('Login response:', res)` y ajustar extracción en `flDoLogin()` |
| "Credenciales incorrectas" con credenciales correctas | El endpoint devuelve un error con estructura no estándar | Ver `e.responseText` en consola |
| Propuestas no cargan | `createdBy` no devuelve resultados | Verificar en consola el `agentId` que se está usando |
| Catálogo vacío | Token inválido para `/v1/product` | Verificar que el token del login tenga acceso a productos |
| URL de propuesta incorrecta | La API no devuelve campo `url` | Ver `console.log('URL propuesta:', flPropUrl)` y ajustar en `flSaveProposal()` |

---

## Cómo actualizar

```bash
git add fanalca-login-bot.html
git commit -m "descripción del cambio"
git push origin main
# En 1-2 min la plataforma se actualiza sola
```
