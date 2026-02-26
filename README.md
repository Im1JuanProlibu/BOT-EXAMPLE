# Prolibu Quotation Bot

Sistema de cotización embebible en cualquier plataforma web y cualquier sector. Se actualiza automáticamente desde GitHub sin tocar el editor de la plataforma.

---

## Cómo funciona — Flujo teórico

```
Plataforma Prolibu (editor del bot)
    └── 2 líneas de código fijas (nunca se tocan de nuevo)
            └── carga loader.js desde GitHub Pages
                    └── loader.js hace fetch al archivo {cliente}-bot.html en GitHub
                            └── inyecta el HTML + carga los scripts en orden
                                    └── el bot aparece en pantalla y consulta las APIs de Prolibu
```

**La clave del sistema:** la plataforma solo ve una etiqueta `<script src>` apuntando a GitHub Pages — algo que no puede ejecutar ni modificar. Todo el código real vive en GitHub. Cuando se necesita actualizar el bot, solo se hace `git push` y la plataforma se actualiza sola en 1-2 minutos sin volver a tocar el editor.

---

## Estructura del repositorio

```
/
├── loader.js              →  Script que carga el bot en la plataforma
├── {cliente}-bot.html     →  Bot del cliente (HTML + CSS + JS todo en uno)
├── {cliente2}-bot.html    →  Bot de otro cliente
└── README.md
```

> Cada cliente tiene su propio archivo `{cliente}-bot.html`. El `loader.js` es uno solo y apunta al archivo del cliente correspondiente.

---

## Qué va en el editor de la plataforma

Esto se configura **una sola vez** y nunca más se toca.

```html
<div id="bot-{cliente}">Cargando...</div>
<script src="https://{usuario}.github.io/{repo}/loader.js"></script>
```

**Ejemplo:**
```html
<div id="bot-micliente">Cargando...</div>
<script src="https://miusuario.github.io/mi-repo/loader.js"></script>
```

> El `id` del `<div>` debe coincidir exactamente con el ID que está hardcodeado en el `loader.js` (`document.getElementById('bot-micliente')`). Si no coinciden, el bot no se inyecta.

**Pasos para pegarlo:**
1. Abrir el editor HTML del bot en Prolibu
2. Cambiar a vista código `< >`
3. `Ctrl + A` → borrar todo
4. Pegar las 2 líneas de arriba
5. Dar OK **sin** cambiar a vista visual (si se cambia a vista visual, la plataforma ejecuta el script y rompe el código)

---

## Estructura del loader.js

El `loader.js` es el script intermediario. Es el único archivo que la plataforma carga directamente. Su trabajo es buscar el bot en GitHub e inyectarlo en la página.

**Las dos únicas cosas que cambian por cliente:**

```js
// 1. URL del archivo HTML del bot en GitHub (cambiar por cliente)
var REPO_RAW = 'https://raw.githubusercontent.com/{usuario}/{repo}/main/{cliente}-bot.html';

// 2. ID del contenedor donde se inyecta el bot (debe coincidir con el <div> del editor)
var container = document.getElementById('bot-{cliente}');
```

**Flujo interno paso a paso:**

```
1. fetch(REPO_RAW + '?t=' + Date.now())
       ↓  fuerza descarga fresca (sin caché)
2. Parsea el HTML en un <div> temporal
       ↓
3. Separa los <script src="..."> externos del código JS inline
       ↓
4. Inyecta el HTML del formulario en #bot-{cliente}
       ↓
5. loadInOrder() → carga los scripts externos UNO POR UNO en orden
       ↓  (jQuery → Nodriza SDK → Lodash → Select2 → intl-tel-input)
6. Cuando todos están listos → ejecuta el código JS inline del bot
       ↓
7. Verifica en consola que jQuery, Nodriza, productsList y agentsList existan
```

> **¿Por qué carga secuencial y no paralela?** Si los scripts cargan en paralelo, el código del bot se ejecuta antes de que jQuery o Nodriza SDK estén disponibles, causando errores como `jQuery is not defined`. La carga en orden garantiza las dependencias.

**Código completo del loader.js:**

```js
(function () {
  console.log('🚀 [LOADER] Iniciando...');

  // ⬇️ CAMBIAR ESTO POR CLIENTE
  var REPO_RAW = 'https://raw.githubusercontent.com/USUARIO/REPOSITORIO/main/CLIENTE-bot.html';
  var URL = REPO_RAW + '?t=' + Date.now();

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { cb(); };
    s.onerror = function () { cb(); }; // error no bloquea la cadena
    document.body.appendChild(s);
  }

  function loadInOrder(srcs, cb) {
    if (!srcs.length) return cb();
    loadScript(srcs[0], function () { loadInOrder(srcs.slice(1), cb); });
  }

  fetch(URL)
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (html) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;

      var srcs = [];
      var inlineCode = '';

      tmp.querySelectorAll('script').forEach(function (s) {
        if (s.src) {
          srcs.push(s.src);
          s.parentNode.removeChild(s);
        } else {
          inlineCode += s.textContent;
          s.parentNode.removeChild(s);
        }
      });

      // ⬇️ CAMBIAR ESTO POR CLIENTE (debe coincidir con el id del <div> en el editor)
      var container = document.getElementById('bot-CLIENTE');
      if (container) container.innerHTML = tmp.innerHTML;

      loadInOrder(srcs, function () {
        var sc = document.createElement('script');
        sc.textContent = inlineCode;
        document.body.appendChild(sc);
        console.log('🎉 [LOADER] Bot completamente cargado.');
      });
    })
    .catch(function (e) {
      console.error('❌ [LOADER] Error:', e.message);
      var container = document.getElementById('bot-CLIENTE');
      if (container) container.innerHTML = '<p style="color:red">Error cargando el bot: ' + e.message + '</p>';
    });
})();
```

---

## Cómo se configura GitHub Pages

Para que el `loader.js` sea accesible públicamente:

1. Ir al repositorio en GitHub → `Settings → Pages`
2. Source: **Deploy from a branch**
3. Branch: **main** → **/ (root)**
4. Guardar

URL resultante: `https://{usuario}.github.io/{repo}/loader.js`

---

## Cómo actualizar el bot

```bash
# Editar el archivo del cliente en VS Code, guardar y subir

git add {cliente}-bot.html
git commit -m "descripción del cambio"
git push origin main

# En 1-2 minutos el bot en la plataforma se actualiza solo
```

---

## Checklist — Nuevo cliente

- [ ] Duplicar un `{base}-bot.html` existente y renombrarlo `{cliente}-bot.html`
- [ ] Actualizar las variables de configuración dentro del archivo (ver sección abajo)
- [ ] Actualizar la imagen o video de fondo (`bgImg`)
- [ ] Actualizar `REPO_RAW` en `loader.js` para apuntar al nuevo `{cliente}-bot.html`
- [ ] Verificar que GitHub Pages esté activo en el repositorio
- [ ] Pegar las 2 líneas en el editor de la plataforma (ver sección arriba)
- [ ] Abrir `F12 → Console` y verificar que `productsList` y `agentsList` tengan items

---

## Variables de configuración del bot

Estas variables están al inicio del `<script>` en el archivo `{cliente}-bot.html`:

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `domain` | string | Dominio del cliente en Prolibu. Ej: `cliente.prolibu.com` |
| `botName` | string | Slug del proposalbot configurado en Prolibu |
| `bearerToken` | string | Token de autenticación para consultar productos y categorías |
| `currency` | string | Moneda de las propuestas: `COP`, `USD`, etc. |
| `filtroProductos` | string | Primer filtro de productos: `"Pricing List"`, `"Product"` o vacío |
| `filtroProductos2` | string | Segundo filtro opcional: igual que el anterior. Dejar vacío si no aplica |
| `rolesString` | string | Rol de agentes a cargar. Ej: `"agent"` |
| `useWebhookHubspot` | boolean | `true` activa la integración con HubSpot. `false` la desactiva *(opcional)* |
| `customAttributes` | array | Campos personalizados para HubSpot. Solo necesario si `useWebhookHubspot = true` |

**Inmediatamente después de las variables, instanciar el SDK:**

```js
var nodriza = new Nodriza({ hostname: domain });
```

> **Crítico:** El SDK expone la clase `Nodriza` (con mayúscula). Hay que instanciarla con `new` y asignarla a `nodriza` (minúscula). Si no se hace esto, todas las llamadas a `nodriza.api.*` fallan con `nodriza is not defined`.

---

## Funciones base del bot

Todo bot está compuesto por las mismas funciones esenciales:

### `fetchData(url, method, params, headers, successCallback, errorCallback)`
Función genérica de AJAX. Todas las llamadas a la API pasan por aquí. Usa jQuery `$.ajax` internamente.

### `loadAgents()`
Consulta `GET /v1/publicservices/getAgents` (endpoint público, sin auth). Los parámetros `status` y `roles` se pasan como **data params de jQuery** (no en la query string de la URL), de lo contrario el servidor devuelve 400:

```js
fetchData(
  'https://' + domain + '/v1/publicservices/getAgents',
  'GET',
  { status: 'active', roles: [rolesString] },  // ← data params, NO query string
  {},
  function(res) { ... }
);
```

Construye el array `agentsList`. La respuesta puede ser un array directo o un objeto con `.results`; hay que manejar ambos casos:
```js
var agents = Array.isArray(res) ? res : (res.results || []);
```

### `loadProducts()`
Consulta `GET /v1/product?disabled=false` con el `bearerToken`. Construye `productsList` con `pricingList`, `category`, `sku`, `name` y `disabled`. Puebla el `<select#model>` con Select2.

### `loadCategories()`
Consulta `GET /v1/category` con el `bearerToken`. Construye `categoriesList` y puebla los selectores `#category` y `#category2` si `filtroProductos` está definido.

### `getSelectedProducts()`
Filtra `productsList` según la categoría/lista de precios seleccionada en `#category` y/o `#category2`. Soporta filtros dobles simultáneos. Devuelve solo productos activos (`disabled: false`).

### `getModelOptions()`
Toma el resultado de `getSelectedProducts()`, lo ordena alfabéticamente y genera el HTML de opciones para el `<select#model>`.

### `getProductsBy(key, values)`
Busca un producto en `productsList` por cualquier campo. Se usa en `createProposal` para obtener el objeto completo del producto a partir del SKU seleccionado.

### `ordenarOpciones(selector)`
Ordena alfabéticamente las opciones de cualquier `<select>`. Se aplica después de poblar agentes, productos y categorías.

### `toggleContainer()`
Muestra u oculta el contenedor del selector de modelos según si hay una categoría seleccionada. Solo aplica cuando `filtroProductos` está activo.

### `updateFullPhoneNumber()`
Combina el código de marcación del país (obtenido de intl-tel-input) con el número ingresado. Construye `fullPhoneNumber` en formato E.164: `+573001234567`.

### `submitForm(e)`
Valida que el checkbox de autorización esté marcado, luego llama a `nodriza.api.confirmationCode.confirm()` para validar el captcha. Si el captcha es válido recibe un `hash` y llama a `createProposal(json)`.

> No llamar a `nodriza.config()` — ese método no existe en el SDK. La configuración se pasa al instanciar con `new Nodriza({ hostname: domain })`.

### `createProposal(json)`
Construye el payload completo y hace el POST a `/v1/proposalbot/generate` via el SDK de Nodriza. Si la respuesta incluye `res.url`, redirige al usuario a WhatsApp con el link de la cotización.

---

## Flujo completo de una cotización

```
$(document).ready()
    ├── loadAgents()      →  puebla #agent
    ├── loadProducts()    →  puebla #model
    └── loadCategories()  →  puebla #category y #category2 (si aplica)

Usuario llena el formulario y hace submit
    └── submitForm(e)
            └── valida checkbox de autorización
                    └── nodriza.api.confirmationCode.confirm({ code })
                            └── si válido → recibe hash
                                    └── createProposal(json)
                                            └── POST /v1/proposalbot/generate
                                                    └── recibe res.url
                                                            └── redirige a WhatsApp
```

### Body del POST que genera la propuesta

```json
{
  "chatbot": "slug-del-bot",
  "to": {
    "firstName": "...",
    "lastName": "...",
    "mobile": "+573001234567",
    "email": "...",
    "agent": "email-del-asesor@cliente.com"
  },
  "doc": {
    "title": "Cotización Nombre - Producto",
    "products": [{ "id": "sku-del-producto", "quantity": 1 }],
    "status": "Ready",
    "currency": "COP",
    "metadata": {
      "webhook": false,
      "customAttributes": []
    },
    "dic": { "hash": "hash-del-captcha" }
  },
  "emailClient": true,
  "emailAgent": true,
  "assignedAgentEmail": "email-del-asesor@cliente.com"
}
```

> `webhook: false` por defecto. Solo se activa si el cliente tiene HubSpot configurado.

---

## Tipos de bots que se pueden construir

Partiendo de las funciones base, se pueden armar distintas variantes:

### Bot básico — sin filtros
El más simple. Carga todos los productos activos directamente en el selector de modelos. El usuario elige producto, llena sus datos y cotiza.
- `filtroProductos = ''` y `filtroProductos2 = ''`
- Los selectores de categoría no aparecen
- `#product-container` siempre visible

### Bot con un filtro de categoría
El usuario primero elige una categoría (lista de precios o categoría de producto) y el selector de modelos se puebla dinámicamente con los productos de esa categoría.
- `filtroProductos = 'Pricing List'` o `filtroProductos = 'Product'`
- `filtroProductos2 = ''`
- El `#product-container` aparece solo cuando hay categoría seleccionada

### Bot con dos filtros encadenados
Para catálogos con dos niveles de clasificación. Ejemplo: primero se elige la línea de productos y luego la categoría específica.
- `filtroProductos = 'Pricing List'` y `filtroProductos2 = 'Product'`
- Ambos selectores activos
- Los productos se filtran combinando los dos valores seleccionados

### Bot con selección de asesor visible
El usuario puede elegir directamente su asesor desde un dropdown. Útil cuando los clientes ya conocen a su ejecutivo de cuenta.
- `loadAgents()` activo con el `rolesString` configurado
- `<select#agent>` visible en el formulario

### Bot sin selección de asesor
Para flujos automáticos donde el asesor se asigna por round-robin o se define fijo sin que el usuario lo vea.
- `<select#agent>` oculto con CSS o eliminado del HTML
- El asesor se asigna en `createProposal()` usando lógica interna

### Bot con integración HubSpot *(opcional)*
Crea automáticamente un deal en HubSpot al generar la propuesta. No es requerido — la propuesta se genera igual sin esto.
- `useWebhookHubspot = true`
- Configurar `customAttributes` con los campos del CRM del cliente:
```js
const customAttributes = [
  { name: "Campo Deal",    idAttribute: "hs_field",    model: "deals",    value: "valor" },
  { name: "Campo Contacto", idAttribute: "hs_contact", model: "contacts", value: "valor" }
]
```

---

## Ejemplo completo — customer-design-bot.html

Documentación del bot implementado para el cliente **Customer Design** (`customer-design.prolibu.com`). Sirve como referencia para construir bots similares.

---

### Configuración

```js
var domain              = 'customer-design.prolibu.com';
var botName             = 'botprueba';
const bearerToken       = 'a6a0278f-b899-44ec-9870-417381a5b6dc';
const currency          = 'COP';
const filtroProductos   = '';       // Sin filtro: todos los productos activos
const filtroProductos2  = '';
const rolesString       = 'agent';
const useWebhookHubspot = false;    // Sin HubSpot
const customAttributes  = [];

var nodriza = new Nodriza({ hostname: domain }); // ← Instanciar siempre aquí
```

---

### Tipo de bot

- **Sin filtros de categoría**: todos los productos activos aparecen directamente en el selector de modelos. `#product-container` siempre visible.
- **Asesor automático**: no hay `<select>` de asesor visible. El asesor se asigna automáticamente tomando el primero de la lista:
  ```js
  var agentEmail = agentsList.length > 0 ? agentsList[0].email : '';
  ```
- **Sin HubSpot**: `useWebhookHubspot = false`, `customAttributes = []`.
- **Redirección directa**: al generar la propuesta, redirige a `res.url` directamente (no a WhatsApp).

---

### Diseño — Layout split panel

El layout divide la pantalla en dos zonas: imagen de fondo a la izquierda y panel oscuro a la derecha.

**Técnica clave para la imagen de fondo:**

El contenedor del bot está embebido dentro de la plataforma Prolibu, que no tiene altura fija. Para que la imagen se vea siempre, se usa una capa absoluta en lugar de un `div` con flex:

```html
<div class="bot-wrapper">               <!-- position: relative; min-height: 100vh -->
  <div class="bot-bg"></div>            <!-- position: absolute; inset: 0 — la imagen -->
  <div class="bot-panel">...</div>      <!-- position: relative; z-index: 1; margin-left: auto -->
</div>
```

```css
/* Capa de imagen — siempre ocupa todo el wrapper */
.bot-bg {
  position: absolute;
  inset: 0;
  background-image: url('URL_DE_LA_IMAGEN');
  background-size: cover;
  background-position: center;
  z-index: 0;
}

/* Degradado sobre la imagen para suavizar el borde con el panel */
.bot-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0,0,0,0.1) 40%, rgba(9,9,14,0.8) 100%);
}

/* Panel flotante a la derecha */
.bot-panel {
  position: relative;
  z-index: 1;
  width: 460px;
  max-width: 100%;
  min-height: 100vh;
  margin-left: auto;    /* ← flota a la derecha sin necesitar flex */
}
```

> **Por qué no `flex` ni `background-image` en el contenedor padre**: el contenedor de la plataforma colapsa si no tiene contenido. La capa absoluta (`inset: 0`) se ancla al `position: relative` del wrapper y siempre se expande al tamaño del contenido, independientemente de la plataforma.

---

### Colores — CSS Variables

```css
#bot-customer-design {
  --orange:      #a855f7;   /* violeta/morado — acento principal */
  --orange-deep: #9333ea;   /* hover del botón */
  --panel:       #09090e;   /* fondo del panel */
  --panel-soft:  #111118;
  --input-bg:    #16161f;   /* fondo de inputs */
  --input-bd:    #2a2a38;   /* borde de inputs */
  --input-focus: #a855f7;   /* borde al enfocar */
  --label:       #a855f7;   /* color de section-labels */
  --text:        #f1f5f9;
  --text-soft:   #8892a4;
  --white:       #ffffff;
}
```

> Las variables usan `--orange` como nombre genérico (heredado del template base) aunque el color real sea violeta. Al cambiar de cliente, solo se actualiza el valor hex.

---

### Captcha — Configuración

El captcha se divide en **dos `form-group` independientes**: uno para el iframe y otro para el input. No van juntos en el mismo contenedor.

```html
<!-- Grupo 1: imagen del captcha -->
<div class="form-group">
  <iframe id="captcha-frame" width="200" height="70" scrolling="no"
    style="border:none; border-radius:8px; background:#000; display:block;"></iframe>
</div>

<!-- Grupo 2: input del código (separado) -->
<div class="form-group">
  <input type="text" id="confirmationCode" placeholder="Código de verificación" required>
</div>
```

```js
// En $(document).ready():
$('#captcha-frame').attr('src',
  'https://' + domain + '/v1/ConfirmationCode/?color=white&noise=2&size=4'
);
```

**Parámetros del captcha:**
- `color=white` — dígitos blancos (necesario con fondo oscuro)
- `noise=2` — nivel de ruido visual
- `size=4` — cantidad de dígitos
- `background:#000` en el iframe — fondo negro para que los dígitos blancos sean visibles

> Sin `background:#000` en el iframe, los dígitos blancos son invisibles sobre el fondo blanco por defecto del `<iframe>`.

---

### Teléfono — intl-tel-input

```js
iti = window.intlTelInput(document.querySelector('#phone'), {
  initialCountry: 'co',
  preferredCountries: ['co', 'mx', 'us'],
  utilsScript: 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js'
});
```

**CSS crítico para que el campo no se vea mal:**

```css
/* El contenedor .iti debe ocupar todo el ancho */
.iti {
  width: 100% !important;
  display: block !important;
}

/* Padding solo para el tel — diferente al text/email */
.iti input[type="tel"] {
  padding: 12px 54px !important;  /* 54px izquierda para dejar espacio a la bandera */
}
```

> El `padding-left: 54px` en el `input[type="tel"]` es necesario para que el texto del número no quede debajo de la bandera/código de país que inyecta intl-tel-input.

---

### Imagen de fondo usada

```
https://s3.amazonaws.com/files.nodriza.io/gezpomotor/bot/voyahhearo.png
```

---

### Loader.js configurado para este cliente

```js
var REPO_RAW    = 'https://raw.githubusercontent.com/Im1JuanProlibu/BOT-EXAMPLE/main/customer-design-bot.html';
var CONTAINER_ID = 'bot-customer-design';
```

**Lo que va en el editor de Prolibu:**
```html
<div id="bot-customer-design">Cargando...</div>
<script src="https://Im1JuanProlibu.github.io/BOT-EXAMPLE/loader.js"></script>
```

---

## Debug rápido — F12 Console

| Log / Error | Qué significa | Solución |
|-------------|---------------|----------|
| `[LOADER] Iniciando...` | El script cargó correctamente | — |
| `[LOADER] Respuesta HTTP: 200 OK` | GitHub respondió bien | — |
| `[LOADER] Bot completamente cargado.` | Todo listo | — |
| `productsList: 0 items` | El filtro de productos no coincide o el token es incorrecto | Verificar `bearerToken` y filtros |
| `agentsList: 0 items` | No hay agentes activos con ese rol | Verificar `rolesString` y que los agentes tengan `status: active` |
| `[LOADER] Error: HTTP 404` | El archivo HTML no existe en el repo o `REPO_RAW` apunta mal | Verificar la URL en `loader.js` |
| `nodriza is not defined` | El SDK no se instanció o la URL del SDK es incorrecta | Agregar `var nodriza = new Nodriza({ hostname: domain });` después de las variables de config |
| `400 Bad Request` en `getAgents` | Los roles se están pasando como query string en la URL | Pasarlos como data params de jQuery: `{ status: 'active', roles: [rolesString] }` |
| `nodriza.config is not a function` | Se está llamando a un método que no existe | Eliminar `nodriza.config()` — la config se pasa al instanciar |

**Nota sobre la URL del SDK:** la ruta en S3 es literalmente `nodriza@lastest` (con esa ortografía). No cambiarla a `latest` — devuelve 404.

```
https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js
                                                      ↑
                                          Así está en S3 (no es typo)
```

---

## Prompt — Generar un bot nuevo con IA

Usar este prompt con Claude, ChatGPT o Copilot para generar el archivo `{cliente}-bot.html` desde cero. Completar las secciones entre `[ ]`.

````
Necesito que construyas un bot de cotización en un solo archivo HTML
que funcionará embebido en una plataforma web via un loader.js externo.

## Stack y librerías (cargar en este orden exacto)
1. jQuery 2.2.2       — https://ajax.googleapis.com/ajax/libs/jquery/2.2.2/jquery.min.js
2. Nodriza SDK        — https://s3.amazonaws.com/cdn.nodriza.io/sdk/nodriza@lastest/nodriza-sdk.bundle.js
3. Lodash 4.17        — https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.11/lodash.core.min.js
4. Select2 4.1        — https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js
5. intl-tel-input 17  — https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js

CSS requerido:
- https://s3.amazonaws.com/cdn.nodriza.io/assets/css/chatbot.automotriz.css
- https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css
- https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/css/intlTelInput.css

## Variables de configuración
```js
var domain              = '[cliente.prolibu.com]';
var botName             = '[slug del proposalbot en Prolibu]';
const bearerToken       = '[xxxx-xxxx-xxxx-xxxx]';
const currency          = '[COP|USD]';
const filtroProductos   = '[Pricing List | Product | vacío]';
const filtroProductos2  = '[Pricing List | Product | vacío]';
const rolesString       = '[agent, admin]';
const useWebhookHubspot = false;   // true solo si el cliente tiene HubSpot
const customAttributes  = [];      // llenar solo si useWebhookHubspot = true
```

## Tipo de bot
[Indicar cuál de estos tipos aplica:]
- Sin filtros: todos los productos activos en un solo select
- Con un filtro: primero elige categoría, luego producto
- Con dos filtros: dos niveles de categoría antes del producto
- Con asesor visible: el usuario elige su asesor
- Sin asesor visible: asignación automática

## Qué se cotiza
[Describir el tipo de producto o servicio]
[Indicar si los productos se filtran por pricingList, category, o ambos]

## Agentes
[Qué roles tienen los asesores en Prolibu: agent, admin, etc.]
[Si el asesor es visible para el usuario o se asigna automáticamente]

## Recurso de fondo
[URL de imagen o video de fondo]

## Flujo del formulario
1. Al cargar: consultar agentes, productos y categorías en paralelo
2. Selectores de categoría (si aplica) → al cambiar, actualizar select de modelos
3. Select de modelo con Select2
4. Campos: nombre, apellido, celular (intl-tel-input, país inicial: co), email
5. Captcha: embed desde /v1/ConfirmationCode/?color=white&noise=2&size=4 + input
6. Checkbox de autorización (requerido) y promociones (opcional)
7. Submit → validar captcha → POST /v1/proposalbot/generate → redirigir a WhatsApp

## Diseño
[Color de fondo o URL de recurso visual]
[Color de acento — hex]
[Fuente de Google Fonts]
[Columnas en desktop / mobile]

## Importante
- El HTML se inyecta dentro de <div id="bot-[cliente]">
- NO usar document.write
- Todo en un solo archivo .html (CSS + HTML + JS)
- No depender de elementos del DOM fuera del contenedor
- El endpoint de propuesta es POST /v1/proposalbot/generate (via nodriza.api.proposalbot.generate)
````
