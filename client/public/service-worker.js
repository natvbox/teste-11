// Service Worker para PWA
// Gerencia cache de recursos e funcionalidades offline
//
// OBJETIVO:
// - NUNCA servir index.html antigo (isso congela bundle do Vite)
// - NÃO tocar em /api (especialmente /api/trpc) para evitar bugs de payload/cookies
// - Cache seguro para assets estáticos (JS/CSS/img/font), com atualização automática

const CACHE_NAME = "notifique-me-v3";
const RUNTIME_CACHE = "notifique-me-runtime-v3";

// Se quiser debug do SW, altere para true.
const DEBUG = false;

// ✅ NÃO precache de "/" ou "/index.html"
// Isso é o que mais congela deploy no Vite e gera “bugs fantasma”
const PRECACHE_URLS = [
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/badge-72x72.png",
];

// Instalação do service worker
self.addEventListener("install", (event) => {
  if (DEBUG) console.log("[Service Worker] Instalando...");

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      if (DEBUG) console.log("[Service Worker] Fazendo cache de recursos");
      return cache.addAll(PRECACHE_URLS);
    })
  );

  // Ativar imediatamente
  self.skipWaiting();
});

// Ativação do service worker
self.addEventListener("activate", (event) => {
  if (DEBUG) console.log("[Service Worker] Ativando...");

  event.waitUntil(
    (async () => {
      // Remove caches antigos
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            if (DEBUG) console.log("[Service Worker] Removendo cache antigo:", name);
            return caches.delete(name);
          })
      );

      // ✅ Limpa qualquer index.html antigo que tenha sido cacheado por versões antigas
      const runtime = await caches.open(RUNTIME_CACHE);
      await runtime.delete("/index.html");
      await runtime.delete("/");
      const precache = await caches.open(CACHE_NAME);
      await precache.delete("/index.html");
      await precache.delete("/");

      // Tomar controle imediatamente
      await self.clients.claim();

      // Opcional: força recarregar todas as abas para pegar bundle novo
      const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      clientsList.forEach((client) => client.postMessage({ type: "SW_ACTIVATED" }));
    })()
  );
});

// Interceptar requisições
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições não-HTTP
  if (!url.protocol.startsWith("http")) return;

  // ✅ NUNCA interceptar API (principalmente /api/trpc)
  // Isso evita qualquer risco de body/cookies/sessão quebrar.
  if (url.pathname.startsWith("/api/")) {
    return; // deixa passar direto (network)
  }

  // ✅ Navegação (HTML) = NETWORK ONLY (com fallback offline opcional)
  // Isso garante que o index.html SEMPRE vem atualizado do servidor.
  const isNavigation =
    request.mode === "navigate" ||
    request.destination === "document" ||
    url.pathname === "/" ||
    url.pathname === "/index.html";

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(async () => {
        // Fallback offline: tenta um HTML cacheado (se existir) — sem regravar index
        const cached = await caches.match(request);
        return cached || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
      })
    );
    return;
  }

  // ✅ Cache API não suporta métodos diferentes de GET
  if (request.method !== "GET") return;

  // Estratégia: Stale-While-Revalidate para assets estáticos
  // - Serve rápido do cache
  // - Atualiza em background (não fica preso em versão antiga)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          // Não cachear respostas inválidas
          if (!response || response.status !== 200 || response.type === "error") return response;

          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Sincronização em background
self.addEventListener("sync", (event) => {
  if (DEBUG) console.log("[Service Worker] Sincronização em background:", event.tag);

  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

// Função para sincronizar notificações
async function syncNotifications() {
  try {
    if (DEBUG) console.log("[Service Worker] Sincronizando notificações...");
    return Promise.resolve();
  } catch (error) {
    console.error("[Service Worker] Erro ao sincronizar:", error);
    return Promise.reject(error);
  }
}

// Listener para mensagens do cliente
self.addEventListener("message", (event) => {
  if (DEBUG) console.log("[Service Worker] Mensagem recebida:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CACHE_URLS") {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => cache.addAll(event.data.urls))
    );
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => Promise.all(cacheNames.map((name) => caches.delete(name))))
    );
  }
});

// Push notification listener
self.addEventListener("push", (event) => {
  if (DEBUG) console.log("[Service Worker] Push recebido:", event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Nova Notificação", body: event.data.text() };
    }
  }

  const title = data.title || "Notifique-me";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192x192.png",
    badge: "/badge-72x72.png",
    image: data.image,
    data: data.data || {},
    tag: data.tag || "default",
    requireInteraction: false,
    actions: [
      { action: "open", title: "Abrir" },
      { action: "close", title: "Fechar" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click listener
self.addEventListener("notificationclick", (event) => {
  if (DEBUG) console.log("[Service Worker] Notificação clicada:", event);

  event.notification.close();

  if (event.action === "close") return;

  const urlToOpen = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});

// Notification close listener
self.addEventListener("notificationclose", (event) => {
  if (DEBUG) console.log("[Service Worker] Notificação fechada:", event);
});
