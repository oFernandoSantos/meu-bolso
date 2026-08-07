import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const publicDir = path.resolve("public");
const manifestPath = path.join(distDir, "manifest.webmanifest");
const serviceWorkerPath = path.join(distDir, "sw.js");
const indexHtmlPath = path.join(distDir, "index.html");

const manifest = {
  name: "Meu Bolso",
  short_name: "Meu Bolso",
  description: "Controle seus gastos, renda e valores guardados em um app instalavel.",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "portrait",
  background_color: "#050505",
  theme_color: "#050505",
  lang: "pt-BR",
  icons: [
    {
      src: "/favicon.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
};

const serviceWorker = `const CACHE_NAME = "meu-bolso-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/favicon.png", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/index.html")));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
`;

const headTags = `
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#050505" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Meu Bolso" />
    <style>
      html,
      body,
      #root {
        background: #050505;
      }

      body::after {
        content: "";
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: env(safe-area-inset-bottom);
        background: #101010;
        pointer-events: none;
        z-index: 999999;
      }
    </style>
`;

const registerScript = `
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/sw.js");
        });
      }
    </script>
`;

await mkdir(distDir, { recursive: true });

await copyFile(path.join(publicDir, "favicon.png"), path.join(distDir, "favicon.png"));
await copyFile(path.join(publicDir, "apple-touch-icon.png"), path.join(distDir, "apple-touch-icon.png"));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeFile(serviceWorkerPath, serviceWorker);

const indexHtml = await readFile(indexHtmlPath, "utf8");
const withManifest = indexHtml.includes('rel="manifest"')
  ? indexHtml
  : indexHtml.replace("</head>", `${headTags}</head>`);
const withServiceWorker = withManifest.includes('navigator.serviceWorker.register("/sw.js")')
  ? withManifest
  : withManifest.replace("</body>", `${registerScript}</body>`);

await writeFile(indexHtmlPath, withServiceWorker);
