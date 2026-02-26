#!/usr/bin/env node
'use strict';

const readline = require('readline');
const fs       = require('fs');
const path     = require('path');

const DIR         = __dirname;
const GITHUB_USER = 'Im1JuanProlibu';
const GITHUB_REPO = 'BOT-EXAMPLE';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ── Helpers de input ─────────────────────────────────────────────────────────

function ask(label, def) {
  return new Promise(resolve => {
    const prompt = def !== undefined ? `  ${label} [${def}]: ` : `  ${label}: `;
    rl.question(prompt, ans => resolve(ans.trim() || (def !== undefined ? def : '')));
  });
}

function pick(label, opts) {
  return new Promise(resolve => {
    console.log(`\n  ${label}`);
    opts.forEach((o, i) => console.log(`    ${i + 1}. ${o}`));
    rl.question('  > ', ans => {
      const i = parseInt(ans, 10) - 1;
      resolve(i >= 0 && i < opts.length ? i : 0);
    });
  });
}

function line() { console.log('\n  ' + '─'.repeat(52)); }

function loaderTemplate(outName, containerId) {
  return `(function () {
  console.log('🚀 [LOADER] Iniciando...');

  var REPO_RAW     = 'https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${outName}';
  var CONTAINER_ID = '${containerId}';

  var URL = REPO_RAW + '?t=' + Date.now();

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { cb(); };
    s.onerror = function () { cb(); };
    document.body.appendChild(s);
  }

  function loadInOrder(srcs, cb) {
    if (!srcs.length) return cb();
    loadScript(srcs[0], function () { loadInOrder(srcs.slice(1), cb); });
  }

  fetch(URL)
    .then(function (r) {
      console.log('[LOADER] Respuesta HTTP:', r.status, r.statusText);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    })
    .then(function (html) {
      var tmp = document.createElement('div');
      tmp.innerHTML = html;

      var srcs = [];
      var inlineCode = '';

      tmp.querySelectorAll('script').forEach(function (s) {
        if (s.src) { srcs.push(s.src); s.parentNode.removeChild(s); }
        else { inlineCode += s.textContent; s.parentNode.removeChild(s); }
      });

      var container = document.getElementById(CONTAINER_ID);
      if (container) { container.innerHTML = tmp.innerHTML; }
      else { console.error('❌ [LOADER] No se encontró el contenedor #' + CONTAINER_ID); return; }

      loadInOrder(srcs, function () {
        var sc = document.createElement('script');
        sc.textContent = inlineCode;
        document.body.appendChild(sc);
        console.log('🎉 [LOADER] Bot completamente cargado.');
      });
    })
    .catch(function (e) {
      console.error('❌ [LOADER] Error:', e.message);
      var container = document.getElementById(CONTAINER_ID);
      if (container) container.innerHTML = '<p style="color:red;font-family:sans-serif;padding:16px;">Error cargando el bot: ' + e.message + '</p>';
    });
})();
`;
}

function printResult(htmlName, loaderName, containerId, extras) {
  line();
  console.log('\n  ✅  Archivos generados:\n');
  console.log(`     📄  ${htmlName}`);
  console.log(`     📄  ${loaderName}`);
  console.log('\n  📋  Pega esto en el editor de Prolibu (una sola vez):\n');
  console.log(`     <div id="${containerId}">Cargando...</div>`);
  console.log(`     <script src="https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${loaderName}"></script>`);
  console.log('\n  🔧  Próximos pasos:\n');
  console.log(`     git add ${htmlName} ${loaderName}`);
  console.log(`     git commit -m "feat: ${htmlName}"`);
  console.log(`     git push origin main`);
  console.log('     → En 1-2 min la plataforma se actualiza sola');
  if (extras && extras.length) {
    console.log('\n  ⚠️   Pendiente en el archivo HTML:\n');
    extras.forEach(e => console.log(`     • ${e}`));
  }
  console.log('');
}

// ── BOT CREADOR ───────────────────────────────────────────────────────────────

async function crearBotCreador() {
  console.log('\n  📝  Bot Creador — rellena los datos del cliente\n');

  const slug    = await ask('Slug del cliente (minúsculas, sin espacios, ej: acme)');
  const domain  = await ask('Dominio en Prolibu (ej: acme.prolibu.com)');
  const botName = await ask('Slug del proposalbot en Prolibu');
  const token   = await ask('Bearer token');
  const currency = await ask('Moneda', 'COP');
  const roles   = await ask('Roles de asesores', 'agent');

  const filtroIdx = await pick('¿Filtro de productos?', [
    'Sin filtro — todos los productos en un select',
    '1 filtro  — usuario elige categoría, luego producto',
    '2 filtros — dos niveles de categoría',
  ]);

  let filtro1 = '', filtro2 = '';
  if (filtroIdx >= 1) filtro1 = await ask('Tipo de filtro 1 (Pricing List / Product)', 'Pricing List');
  if (filtroIdx >= 2) filtro2 = await ask('Tipo de filtro 2 (Pricing List / Product)', 'Product');

  const hubspot = await pick('¿Integración con HubSpot?', ['No', 'Sí']);

  const accent = await ask('Color de acento principal (hex)', '#a855f7');
  const accentDeep = await ask('Color de acento hover (hex)', '#9333ea');
  const font   = await ask('Fuente de Google Fonts', 'Inter');
  const bgImg  = await ask('URL imagen de fondo (Enter para omitir)', '');

  // ── Leer template ─────────────────────────────────────────────
  const tplPath = path.join(DIR, 'customer-design-bot.html');
  if (!fs.existsSync(tplPath)) {
    console.error('\n  ❌  No se encontró customer-design-bot.html como plantilla.\n');
    return;
  }
  let html = fs.readFileSync(tplPath, 'utf8');

  // ── Reemplazar config ──────────────────────────────────────────
  html = html
    .replace(/var domain\s*=\s*'[^']*';/, `var domain = '${domain}';`)
    .replace(/var botName\s*=\s*'[^']*';/, `var botName = '${botName}';`)
    .replace(/const bearerToken\s*=\s*'[^']*';/, `const bearerToken = '${token}';`)
    .replace(/const currency\s*=\s*'[^']*';/, `const currency = '${currency}';`)
    .replace(/const filtroProductos\s*=\s*'[^']*';/, `const filtroProductos = '${filtro1}';`)
    .replace(/const filtroProductos2\s*=\s*'[^']*';/, `const filtroProductos2 = '${filtro2}';`)
    .replace(/const rolesString\s*=\s*'[^']*';/, `const rolesString = '${roles}';`)
    .replace(/const useWebhookHubspot\s*=\s*(true|false);/, `const useWebhookHubspot = ${hubspot === 1};`);

  // ── Reemplazar container ID ────────────────────────────────────
  const oldId  = 'bot-customer-design';
  const newId  = `bot-${slug}`;
  html = html.split(oldId).join(newId);

  // ── Reemplazar colores de acento ───────────────────────────────
  html = html
    .split('#a855f7').join(accent)
    .split('#9333ea').join(accentDeep);

  // ── Reemplazar fuente si cambió ────────────────────────────────
  if (font !== 'Inter') {
    html = html
      .split("family=Inter").join(`family=${font.replace(/ /g, '+')}`)
      .split("font-family: 'Inter'").join(`font-family: '${font}'`)
      .split('Inter, sans-serif').join(`'${font}', sans-serif`);
  }

  // ── Guardar archivos ───────────────────────────────────────────
  const htmlName   = `${slug}-bot.html`;
  const loaderName = `loader-${slug}.js`;
  const containerId = newId;

  fs.writeFileSync(path.join(DIR, htmlName),   html, 'utf8');
  fs.writeFileSync(path.join(DIR, loaderName), loaderTemplate(htmlName, containerId), 'utf8');

  const extras = [];
  if (bgImg) extras.push(`Imagen de fondo: busca bgImg en el archivo y reemplaza con:\n       ${bgImg}`);
  if (hubspot === 1) extras.push('customAttributes: rellena el array con los campos de HubSpot');
  extras.push(`Revisa el diseño y ajusta textos del formulario para el cliente ${slug}`);

  printResult(htmlName, loaderName, containerId, extras);
}

// ── BOT EDITOR ────────────────────────────────────────────────────────────────

async function crearBotEditor() {
  console.log('\n  📝  Bot Editor — rellena los datos del cliente\n');

  const slug   = await ask('Slug del cliente (minúsculas, sin espacios, ej: acme)');
  const domain = await ask('Dominio en Prolibu (ej: acme.prolibu.com)');
  const token  = await ask('Bearer token');
  const roles  = await ask('Roles de asesores', 'agent');

  const accentIdx = await pick('Color de acento del editor', [
    'Azul   #3b82f6  (por defecto)',
    'Violeta #a855f7',
    'Verde  #22c55e',
    'Otro — ingresaré el hex',
  ]);

  let accent = '#3b82f6', accentDeep = '#2563eb', accentGlow = 'rgba(59,130,246,0.14)';
  if (accentIdx === 1) { accent = '#a855f7'; accentDeep = '#9333ea'; accentGlow = 'rgba(168,85,247,0.14)'; }
  if (accentIdx === 2) { accent = '#22c55e'; accentDeep = '#16a34a'; accentGlow = 'rgba(34,197,94,0.14)'; }
  if (accentIdx === 3) { accent = await ask('Color hex'); accentDeep = accent; accentGlow = 'rgba(0,0,0,0.1)'; }

  // ── Leer template ─────────────────────────────────────────────
  const tplPath = path.join(DIR, 'proposal-editor-bot.html');
  if (!fs.existsSync(tplPath)) {
    console.error('\n  ❌  No se encontró proposal-editor-bot.html como plantilla.\n');
    return;
  }
  let html = fs.readFileSync(tplPath, 'utf8');

  // ── Reemplazar config ──────────────────────────────────────────
  html = html
    .replace(/var domain\s*=\s*'[^']*';/, `var domain      = '${domain}';`)
    .replace(/var bearerToken\s*=\s*'[^']*';/, `var bearerToken = '${token}';`)
    .replace(/var rolesString\s*=\s*'[^']*';/, `var rolesString = '${roles}';`);

  // ── Reemplazar container ID ────────────────────────────────────
  const oldId = 'bot-proposal-editor';
  const newId = `bot-${slug}-editor`;
  html = html.split(oldId).join(newId);

  // ── Reemplazar colores ─────────────────────────────────────────
  if (accentIdx !== 0) {
    html = html
      .split('#3b82f6').join(accent)
      .split('#2563eb').join(accentDeep)
      .split('rgba(59,130,246,0.14)').join(accentGlow)
      .split('rgba(59,130,246,0.12)').join(accentGlow)
      .split('rgba(59,130,246,0.15)').join(accentGlow)
      .split('rgba(59,130,246,0.2)').join(accentGlow.replace('0.14', '0.2'))
      .split('rgba(59,130,246,0.28)').join(accentGlow.replace('0.14', '0.28'))
      .split('rgba(59,130,246,0.3)').join(accentGlow.replace('0.14', '0.3'))
      .split('rgba(59,130,246,0.35)').join(accentGlow.replace('0.14', '0.35'))
      .split('rgba(59,130,246,0.25)').join(accentGlow.replace('0.14', '0.25'));
  }

  // ── Guardar archivos ───────────────────────────────────────────
  const htmlName   = `${slug}-editor-bot.html`;
  const loaderName = `loader-${slug}-editor.js`;

  fs.writeFileSync(path.join(DIR, htmlName),   html, 'utf8');
  fs.writeFileSync(path.join(DIR, loaderName), loaderTemplate(htmlName, newId), 'utf8');

  printResult(htmlName, loaderName, newId, [
    'Verifica en F12 que agentsList tenga asesores',
    'Verifica que las propuestas carguen correctamente con createdBy={agentId}',
    'Revisa en console.log la URL de propuesta que devuelve el PUT para ajustarla si hace falta',
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n  ╔══════════════════════════════════════════╗');
  console.log('  ║   🤖  Generador de bots Prolibu          ║');
  console.log('  ╚══════════════════════════════════════════╝');

  const tipo = await pick('¿Qué tipo de bot quieres crear?', [
    'Bot Creador  — formulario de cotización para clientes',
    'Bot Editor   — gestión de propuestas para asesores',
  ]);

  line();

  if (tipo === 0) await crearBotCreador();
  else            await crearBotEditor();

  rl.close();
}

main().catch(e => { console.error('\n  ❌ Error inesperado:', e.message, '\n'); rl.close(); });
