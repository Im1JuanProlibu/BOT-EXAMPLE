(function () {
  console.log('🚀 [LOADER] Iniciando...');

  // ════════════════════════════════════════════════════
  // ⬇️  CAMBIAR ESTAS DOS LÍNEAS POR CLIENTE
  // ════════════════════════════════════════════════════

  // 1. URL del archivo HTML del bot en GitHub
  var REPO_RAW = 'https://raw.githubusercontent.com/Im1JuanProlibu/BOT-EXAMPLE/main/proposal-editor-bot.html';

  // 2. ID del contenedor — debe coincidir EXACTAMENTE con el <div id="..."> del editor
  var CONTAINER_ID = 'bot-proposal-editor';

  // ════════════════════════════════════════════════════
  // NO MODIFICAR LO QUE ESTÁ DEBAJO DE ESTA LÍNEA
  // ════════════════════════════════════════════════════

  var URL = REPO_RAW + '?t=' + Date.now(); // fuerza descarga fresca, sin caché

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = function () { cb(); };
    s.onerror = function () { cb(); }; // un error no bloquea la cadena
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

      // Separar scripts externos (src) del código JS inline
      tmp.querySelectorAll('script').forEach(function (s) {
        if (s.src) {
          srcs.push(s.src);
          s.parentNode.removeChild(s);
        } else {
          inlineCode += s.textContent;
          s.parentNode.removeChild(s);
        }
      });

      // Inyectar el HTML del formulario en el contenedor
      var container = document.getElementById(CONTAINER_ID);
      if (container) {
        container.innerHTML = tmp.innerHTML;
      } else {
        console.error('❌ [LOADER] No se encontró el contenedor #' + CONTAINER_ID);
        return;
      }

      // Cargar scripts en orden y luego ejecutar el código inline
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
      if (container) {
        container.innerHTML = '<p style="color:red;font-family:sans-serif;padding:16px;">Error cargando el bot: ' + e.message + '</p>';
      }
    });
})();
