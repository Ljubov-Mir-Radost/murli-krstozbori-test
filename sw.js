/* Murli Крстозбори v16 — only public, same-origin app assets are cached. */
const CACHE_PREFIX = `murli-preview-${new URL(self.registration.scope).pathname}-`;
const CACHE = `${CACHE_PREFIX}compact-preview-v3`;
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./catalogue-sync.js", "./compact-layout.js",
  "./Murli_Krstozbor_2026-10-01.json",
  "./Murli_Krstozbor_2026-10-02.json",
  "./Murli_Krstozbori_2026-10_01-02.json",
  "./icons/icon-192.png", "./icons/icon-512.png"
];
const BASE = new URL("./", self.registration.scope);
const APP_URLS = new Set(ASSETS.map(path => new URL(path, BASE).href));
const NAV_URLS = new Set([new URL("./", BASE).href, new URL("./index.html", BASE).href]);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    // One self-contained HTML/JS file; activation never forces a page reload.
    // This also allows upgrades from v15, whose pages lack the update banner.
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try { return await fetch(request, {signal:controller.signal, cache:"no-store"}); }
  finally { clearTimeout(timeout); }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !APP_URLS.has(url.href)) return;
  const isNavigation = request.mode === "navigate" && NAV_URLS.has(url.href);
  // Other navigation routes and unknown JSON / APIs are left to the network.
  if (request.mode === "navigate" && !isNavigation) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Network-first prevents an unchanged sw.js from trapping obsolete HTML.
      // It also makes fixed-name JSON files revalidate upon reconnection.
      const response = await fetchWithTimeout(request);
      if (response.ok && response.type === "basic") {
        try { await cache.put(request, response.clone()); }
        catch (err) { console.warn("PWA cache unavailable:", err); }
      }
      return response;
    } catch (err) {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (isNavigation) {
        const appShell = await cache.match(new URL("./index.html", BASE).href);
        if (appShell) return appShell;
      }
      return Response.error();
    }
  })());
});
