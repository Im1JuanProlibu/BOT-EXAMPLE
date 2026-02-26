# Prolibu Bot System

Sistema de bots embebibles en cualquier plataforma web. Se actualiza automáticamente desde GitHub sin tocar el editor de la plataforma.

Hay dos tipos de bots:

| Tipo | Quién lo usa | Qué hace |
|------|-------------|----------|
| **Bot Creador** | Cliente final | Formulario público para generar una nueva propuesta (cotización) |
| **Bot Editor** | Asesor interno | Herramienta para buscar, editar y guardar propuestas existentes |

---

## Cómo funciona — Flujo general

```
Plataforma Prolibu (editor del bot)
    └── 2 líneas de código fijas (nunca se tocan de nuevo)
            └── carga loader.js desde GitHub Pages
                    └── loader.js hace fetch al archivo {cliente}-bot.html en GitHub
                            └── inyecta el HTML + carga los scripts en orden
                                    └── el bot aparece en pantalla y consulta las APIs de Prolibu
```

**La clave:** la plataforma solo ve un `<script src>` apuntando a GitHub Pages. Todo el código real vive en GitHub. Cuando se necesita actualizar el bot, solo se hace `git push` y la plataforma se actualiza sola en 1-2 minutos sin volver a tocar el editor.

---

## Estructura del repositorio

```
/
├── loader.js                      →  Loader del bot creador (customer-design)
├── loader-proposal-editor.js      →  Loader del bot editor de propuestas
├── customer-design-bot.html       →  Bot creador (formulario para clientes)
├── proposal-editor-bot.html       →  Bot editor (herramienta interna para asesores)
└── README.md
```

> Cada bot tiene su propio loader y su propio archivo HTML. El loader apunta al HTML correspondiente.

---

## Qué va en el editor de la plataforma

Se configura **una sola vez** y nunca más se toca.

```html
<div id="bot-{cliente}">Cargando...</div>
<script src="https://{usuario}.github.io/{repo}/{loader}.js"></script>
```

**Ejemplo bot creador:**
```html
<div id="bot-customer-design">Cargando...</div>
<script src="https://Im1JuanProlibu.github.io/BOT-EXAMPLE/loader.js"></script>
```

**Ejemplo bot editor:**
```html
<div id="bot-proposal-editor">Cargando...</div>
<script src="https://Im1JuanProlibu.github.io/BOT-EXAMPLE/loader-proposal-editor.js"></script>
```

**Pasos para pegarlo:**
1. Abrir el editor HTML del bot en Prolibu
2. Cambiar a vista código `< >`
3. `Ctrl + A` → borrar todo
4. Pegar las 2 líneas
5. Dar OK **sin** cambiar a vista visual (si se cambia a vista visual, la plataforma ejecuta el script y rompe el código)

---

## Crear un bot nuevo — script interactivo

En lugar de copiar y editar archivos manualmente, usar el script `create-bot.js`. Pregunta todo lo necesario y genera el HTML y el loader automáticamente.

```bash
node create-bot.js
```

El script pregunta:
- Tipo de bot (Creador o Editor)
- Datos del cliente (dominio, token, roles…)
- Opciones específicas del tipo (filtros, HubSpot, colores…)

Al terminar imprime los archivos generados, las 2 líneas para pegar en Prolibu y los comandos de git listos para copiar.

---

## Cómo actualizar un bot

```bash
git add {archivo}-bot.html
git commit -m "descripción del cambio"
git push origin main
# En 1-2 minutos la plataforma se actualiza sola
```

---

## Cómo configurar GitHub Pages

1. Ir al repositorio en GitHub → `Settings → Pages`
2. Source: **Deploy from a branch** → Branch: **main** → **/ (root)**
3. Guardar

URL resultante: `https://{usuario}.github.io/{repo}/loader.js`

---

## Estructura del loader.js

**Las dos únicas cosas que cambian por bot:**

```js
// 1. URL del archivo HTML en GitHub
var REPO_RAW = 'https://raw.githubusercontent.com/{usuario}/{repo}/main/{bot}.html';

// 2. ID del contenedor (debe coincidir con el <div> del editor)
var CONTAINER_ID = 'bot-{cliente}';
```

**Flujo interno:**
```
1. fetch(REPO_RAW + '?t=' + Date.now())   ← fuerza descarga sin caché
2. Parsea el HTML en un <div> temporal
3. Separa <script src="..."> externos del JS inline
4. Inyecta el HTML en #bot-{cliente}
5. loadInOrder() → carga scripts externos uno por uno en orden
6. Ejecuta el código JS inline del bot
```

> **¿Por qué carga secuencial?** Si los scripts cargan en paralelo, el código del bot se ejecuta antes de que jQuery o Nodriza SDK estén disponibles. La carga en orden garantiza las dependencias.

---

---

# BOT CREADOR

**Archivo:** `{cliente}-bot.html` — **Loader:** `loader.js`

Formulario público que el cliente final rellena para generar una nueva propuesta. Fluye en una sola pantalla: elige producto, llena sus datos, pasa captcha y recibe la propuesta por WhatsApp o email.

---

## Variables de configuración — Bot Creador

```js
var domain              = 'cliente.prolibu.com';
var botName             = 'slug-del-proposalbot';   // slug configurado en Prolibu
const bearerToken       = 'xxxx-xxxx-xxxx-xxxx';
const currency          = 'COP';                    // o 'USD'
const filtroProductos   = '';                       // 'Pricing List' | 'Product' | ''
const filtroProductos2  = '';                       // segundo filtro (opcional)
const rolesString       = 'agent';
const useWebhookHubspot = false;
const customAttributes  = [];

var nodriza = new Nodriza({ hostname: domain });    // ← instanciar siempre aquí
```

---

## Scripts requeridos — Bot Creador

Cargar en este orden exacto:

```html
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js"></script>
<script src="https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js"></script>
```

CSS:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/css/intlTelInput.css">
```

---

## APIs que usa — Bot Creador

| Método | Endpoint | Auth | Para qué |
|--------|----------|------|----------|
| GET | `/v1/publicservices/getAgents` | Sin auth | Lista de asesores activos |
| GET | `/v1/product?disabled=false` | Bearer token | Catálogo de productos |
| GET | `/v1/category` | Bearer token | Categorías / listas de precios |
| POST | `/v1/proposalbot/generate` | Via SDK (nodriza) | Crear la propuesta |

### `loadAgents()` — Pasar roles como data params, NO como query string

```js
$.ajax({
  url: 'https://' + domain + '/v1/publicservices/getAgents',
  type: 'GET',
  data: { status: 'active', roles: [rolesString] },  // ← data params de jQuery
  success: function(res) { ... }
});
```

> Si se pasan en la URL (`?roles=agent`), el servidor devuelve 400. Deben ir como `data` de jQuery.

### Body del POST que genera la propuesta

```json
{
  "chatbot": "slug-del-bot",
  "to": {
    "firstName": "...", "lastName": "...",
    "mobile": "+573001234567", "email": "...", "agent": "asesor@cliente.com"
  },
  "doc": {
    "title": "Cotización Nombre - Producto",
    "products": [{ "id": "sku", "quantity": 1 }],
    "status": "Ready",
    "currency": "COP",
    "metadata": { "webhook": false, "customAttributes": [] },
    "dic": { "hash": "hash-del-captcha" }
  },
  "emailClient": true,
  "emailAgent": true,
  "assignedAgentEmail": "asesor@cliente.com"
}
```

---

## Flujo del formulario — Bot Creador

```
$(document).ready()
    ├── loadAgents()      → puebla #agent
    ├── loadProducts()    → puebla #model
    └── loadCategories()  → puebla #category (si filtroProductos está activo)

Usuario llena el formulario → submit
    └── submitForm(e)
            └── valida checkbox de autorización
                    └── nodriza.api.confirmationCode.confirm({ code })
                            └── recibe hash
                                    └── createProposal(json)
                                            └── POST /v1/proposalbot/generate
                                                    └── recibe res.url → redirige
```

---

## Variantes del bot creador

| Variante | Config |
|----------|--------|
| Sin filtros | `filtroProductos = ''` — todos los productos directamente en el select |
| 1 filtro de categoría | `filtroProductos = 'Pricing List'` o `'Product'` |
| 2 filtros encadenados | `filtroProductos` y `filtroProductos2` activos |
| Asesor visible | `<select#agent>` visible en el formulario |
| Asesor automático | `<select#agent>` oculto, se toma el primero de `agentsList` |
| Con HubSpot | `useWebhookHubspot = true` + `customAttributes` relleno |

---

## Captcha

```html
<iframe id="captcha-frame" width="200" height="70" scrolling="no"
  style="border:none; border-radius:8px; background:#000; display:block;"></iframe>
<input type="text" id="confirmationCode" placeholder="Código de verificación">
```

```js
$('#captcha-frame').attr('src', 'https://' + domain + '/v1/ConfirmationCode/?color=white&noise=2&size=4');
```

> Sin `background:#000` en el iframe los dígitos blancos son invisibles. El captcha y el input deben ir en dos `form-group` separados.

---

## Teléfono — intl-tel-input

```js
iti = window.intlTelInput(document.querySelector('#phone'), {
  initialCountry: 'co',
  preferredCountries: ['co', 'mx', 'us'],
  utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js'
});
```

```css
/* El contenedor .iti debe ocupar todo el ancho */
.iti { width: 100% !important; display: block !important; }

/* Padding solo al tel para dejar espacio a la bandera */
.iti input[type="tel"] { padding: 12px 54px !important; }
```

---

## Ejemplo real — customer-design-bot.html

| Parámetro | Valor |
|-----------|-------|
| `domain` | `customer-design.prolibu.com` |
| `botName` | `botprueba` |
| `bearerToken` | `a6a0278f-b899-44ec-9870-417381a5b6dc` |
| `currency` | `COP` |
| `filtroProductos` | `''` (sin filtro) |
| `rolesString` | `agent` |
| Asesor | Automático (primer asesor de la lista) |
| Redirección | A `res.url` directamente (no WhatsApp) |

**Loader:**
```js
var REPO_RAW     = 'https://raw.githubusercontent.com/Im1JuanProlibu/BOT-EXAMPLE/main/customer-design-bot.html';
var CONTAINER_ID = 'bot-customer-design';
```

---

## Checklist — Bot Creador nuevo

- [ ] Duplicar `customer-design-bot.html` → renombrar `{cliente}-bot.html`
- [ ] Actualizar las variables de config (`domain`, `botName`, `bearerToken`, `currency`, filtros, `rolesString`)
- [ ] Actualizar imagen / video de fondo (`bgImg`)
- [ ] Crear `loader-{cliente}.js` apuntando al nuevo HTML y container ID
- [ ] Pegar las 2 líneas en el editor de Prolibu
- [ ] Verificar en F12 que `productsList` y `agentsList` tengan items

---

## Prompt IA — Generar bot creador

````
Necesito un bot de cotización en un solo archivo HTML embebible via loader.js externo.

Stack (cargar en este orden exacto):
1. jQuery 2.2.2       — https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js
2. Nodriza SDK        — https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js
3. Lodash 4.17        — https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min.js
4. Select2 4.1        — https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js
5. intl-tel-input 17  — https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js

Variables:
var domain = '[cliente.prolibu.com]';
var botName = '[slug-del-proposalbot]';
const bearerToken = '[token]';
const currency = '[COP|USD]';
const filtroProductos = '[Pricing List | Product | vacío]';
const filtroProductos2 = '[Pricing List | Product | vacío]';
const rolesString = '[agent]';
const useWebhookHubspot = false;
const customAttributes = [];
var nodriza = new Nodriza({ hostname: domain });

Tipo de bot: [sin filtros / con 1 filtro / con 2 filtros / asesor visible / asesor automático]
Qué se cotiza: [descripción del producto o servicio]
Roles de asesores: [agent, admin, etc.]
Recurso de fondo: [URL de imagen o video]
Color de acento: [hex]
Fuente: [Google Fonts]
Diseño: [split panel / una columna / etc.]

Importante:
- HTML se inyecta dentro de <div id="bot-[cliente]">
- Todo en un solo archivo .html (CSS + HTML + JS)
- No depender de elementos del DOM fuera del contenedor
- loadAgents: roles como data params de jQuery, NO en la URL
- nodriza: instanciar con new Nodriza({ hostname: domain }) — no llamar nodriza.config()
- Endpoint de propuesta: POST /v1/proposalbot/generate via nodriza.api.proposalbot.generate
````

---

---

# BOT EDITOR DE PROPUESTAS

**Archivo:** `proposal-editor-bot.html` — **Loader:** `loader-proposal-editor.js`

Herramienta **interna para asesores**. Flujo de 3 pasos: selecciona asesor → carga sus propuestas (Ready + Draft) → edita estado y productos → guarda via PUT. Al guardar muestra la URL de la propuesta con botón para abrirla.

---

## Variables de configuración — Bot Editor

```js
var domain      = 'cliente.prolibu.com';
var bearerToken = 'xxxx-xxxx-xxxx-xxxx';
var rolesString = 'agent';                          // rol de los asesores a cargar

var authHeaders = { Authorization: 'Bearer ' + bearerToken };

var nodriza = new Nodriza({ hostname: domain });    // ← instanciar siempre aquí
```

> El bot editor **no usa** `botName`, `currency`, `filtroProductos` ni `customAttributes` — esos son exclusivos del bot creador.

---

## Scripts requeridos — Bot Editor

```html
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js"></script>
<script src="https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
```

> El bot editor **no necesita** intl-tel-input. No hay campos de teléfono ni captcha.

---

## APIs que usa — Bot Editor

| Método | Endpoint | Auth | Para qué |
|--------|----------|------|----------|
| GET | `/v1/publicservices/getAgents` | Sin auth | Lista de asesores activos |
| GET | `/v1/proposal?createdBy={agentId}&limit=200` | Bearer token | Propuestas del asesor |
| GET | `/v1/proposal/{id}` | Bearer token | Detalle completo de una propuesta |
| PUT | `/v1/proposal/{id}` | Bearer token | Guardar cambios (estado + productos) |
| GET | `/v1/product?disabled=false` | Bearer token | Catálogo para agregar productos |

### Filtro de propuestas — `createdBy={agentId}`

El parámetro correcto para filtrar propuestas por asesor es `createdBy` con el **ID interno del asesor** (formato MongoDB: `65ce76144b8c59003110e36b`), no el email ni el nombre.

```js
// El ID se obtiene de la respuesta de getAgents:
agentsList = list.map(function(a) {
  return { email: a.email, firstName: a.firstName, id: a.id || a._id };
});

// Consulta de propuestas:
$.ajax({
  url: 'https://' + domain + '/v1/proposal',
  data: { createdBy: agentId, limit: 200 },
  headers: { Authorization: 'Bearer ' + bearerToken }
});
```

> **No usar** `responsible=email`, `createdBy=email` ni `createdBy=firstName` — no devuelven resultados.

### Body del PUT para guardar

```json
{
  "status": "Ready",
  "products": [
    { "id": "sku-del-producto", "quantity": 2 }
  ]
}
```

> Si la API devuelve 400 con `products` como array, reintentar enviando `products` como JSON string: `JSON.stringify([...])`.

---

## Flujo del bot editor — 3 pasos

```
$(document).ready()
    ├── loadAgents()   → puebla el select de asesores (Select2)
    └── loadCatalog()  → carga todos los productos para el select de agregar

Paso 1 — Asesor
    └── usuario selecciona asesor → "Ver propuestas"
            └── GET /v1/proposal?createdBy={agentId}&limit=200
                    └── filtra solo Ready y Draft → va al Paso 2

Paso 2 — Propuesta
    └── usuario selecciona propuesta (agrupadas por estado)
            └── preview con título, número y badge de estado
                    └── "Editar propuesta"
                            └── GET /v1/proposal/{id}
                                    └── parseProducts() → va al Paso 3

Paso 3 — Editor
    ├── select de estado (Draft / Ready / Sent)
    ├── lista de productos actuales con cantidad editable y botón eliminar
    ├── select de catálogo con buscador (Select2) + campo cantidad → "Agregar"
    └── "Guardar cambios"
            └── PUT /v1/proposal/{id} con { status, products }
                    └── muestra panel de éxito con URL de la propuesta
                            ├── botón "Abrir propuesta →" (abre en nueva pestaña)
                            └── botón "Copiar enlace"
```

---

## URL de la propuesta al guardar

Después de un PUT exitoso, el bot intenta obtener la URL en este orden:

```js
var url = res.url || res.link || res.shareUrl || res.proposalUrl
       || ('https://' + domain + '/proposal/' + id);
```

Revisar en `console.log('URL de propuesta:', propUrl)` qué campo devuelve la API del cliente para ajustarlo si es necesario.

---

## parseProducts — Manejo defensivo

El campo `products` de la respuesta puede llegar en distintos formatos:

```js
function parseProducts(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normProd);
  if (typeof raw === 'string') {
    try { return JSON.parse(raw).map(normProd); } catch(e) { return []; }
  }
  if (typeof raw === 'object') return [normProd(raw)];
  return [];
}
```

---

## Ejemplo real — proposal-editor-bot.html

| Parámetro | Valor |
|-----------|-------|
| `domain` | `customer-design.prolibu.com` |
| `bearerToken` | `a6a0278f-b899-44ec-9870-417381a5b6dc` |
| `rolesString` | `agent` |
| Estados editables | Draft, Ready, Sent |
| Propuestas que muestra | Solo Ready y Draft (filtra Sent del listado) |

**Loader:**
```js
var REPO_RAW     = 'https://raw.githubusercontent.com/Im1JuanProlibu/BOT-EXAMPLE/main/proposal-editor-bot.html';
var CONTAINER_ID = 'bot-proposal-editor';
```

**Lo que va en el editor de Prolibu:**
```html
<div id="bot-proposal-editor">Cargando...</div>
<script src="https://Im1JuanProlibu.github.io/BOT-EXAMPLE/loader-proposal-editor.js"></script>
```

---

## Checklist — Bot Editor nuevo

- [ ] Duplicar `proposal-editor-bot.html` → renombrar `{cliente}-editor-bot.html`
- [ ] Actualizar `domain`, `bearerToken` y `rolesString`
- [ ] Crear `loader-{cliente}-editor.js` apuntando al nuevo HTML y container ID
- [ ] Verificar en F12 que `agentsList` tenga asesores y que `createdBy={agentId}` devuelva propuestas
- [ ] Comprobar el campo URL en la respuesta del PUT para ajustar `propUrl` si es necesario
- [ ] Pegar las 2 líneas en el editor de Prolibu (página interna, solo acceso de asesores)

---

## Prompt IA — Generar bot editor

````
Necesito un bot editor de propuestas en un solo archivo HTML embebible via loader.js externo.
Es una herramienta interna para asesores, NO un formulario público.

Stack (cargar en este orden exacto):
1. jQuery 2.2.2  — https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js
2. Nodriza SDK   — https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js
3. Lodash 4.17   — https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min.js
4. Select2 4.1   — https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js

Variables:
var domain      = '[cliente.prolibu.com]';
var bearerToken = '[token]';
var rolesString = '[agent]';
var authHeaders = { Authorization: 'Bearer ' + bearerToken };
var nodriza = new Nodriza({ hostname: domain });

APIs a usar:
- GET /v1/publicservices/getAgents  →  { status: 'active', roles: [rolesString] } como data params de jQuery
- GET /v1/proposal  →  filtrar con { createdBy: agentId, limit: 200 } (agentId = a.id || a._id del asesor)
- GET /v1/proposal/{id}  →  detalle con productos
- PUT /v1/proposal/{id}  →  body JSON { status, products: [{ id, quantity }] }
- GET /v1/product?disabled=false  →  catálogo para agregar productos

Flujo requerido:
1. Paso 1: select de asesor (Select2) → botón "Ver propuestas"
2. Paso 2: lista de propuestas del asesor (solo Ready y Draft, agrupadas)
3. Paso 3: editor → cambiar estado, editar cantidades, agregar/quitar productos, guardar
4. Tras guardar: mostrar panel con URL de la propuesta y botones "Abrir" y "Copiar"

URL de la propuesta: intentar res.url || res.link || res.shareUrl || construir https://{domain}/proposal/{id}

Diseño: [oscuro minimalista / claro / etc.]
Color de acento: [hex]
Fuente: [Google Fonts]

Importante:
- HTML se inyecta dentro de <div id="bot-[id]">
- Todo en un solo archivo .html
- No depender de DOM fuera del contenedor
- loadAgents: roles como data params de jQuery, NO en la URL
- nodriza: instanciar con new Nodriza({ hostname: domain })
- parseProducts debe manejar array, JSON string u objeto
- Si PUT devuelve 400, reintentar con products como JSON.stringify([...])
````

---

---

# Debug rápido — F12 Console

| Log / Error | Qué significa | Solución |
|-------------|---------------|----------|
| `[LOADER] Iniciando...` | Script cargó correctamente | — |
| `[LOADER] Respuesta HTTP: 200 OK` | GitHub respondió bien | — |
| `[LOADER] Bot completamente cargado.` | Todo listo | — |
| `[LOADER] Error: HTTP 404` | `REPO_RAW` apunta mal o el archivo no existe | Verificar URL en el loader |
| `nodriza is not defined` | SDK no instanciado | Agregar `var nodriza = new Nodriza({ hostname: domain });` |
| `nodriza.config is not a function` | Método inexistente | Eliminar `nodriza.config()` — la config va al instanciar |
| `400 Bad Request` en `getAgents` | Roles pasados como query string | Usar `data: { status: 'active', roles: [rolesString] }` en jQuery |
| `agentsList: 0 items` | Sin asesores activos con ese rol | Verificar `rolesString` y que los asesores tengan `status: active` |
| `productsList: 0 items` | Token incorrecto o filtro no coincide | Verificar `bearerToken` y filtros |
| Propuestas no cargan (editor) | Filtro incorrecto | Confirmar que se usa `createdBy={agentId}` con el ID interno del asesor |

**Nota sobre la URL del SDK:** la ruta en S3 es literalmente `nodriza@lastest` (con esa ortografía). No cambiarla a `latest` — devuelve 404.

```
https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js
                                                      ↑
                                          Así está en S3 (no es typo)
```
