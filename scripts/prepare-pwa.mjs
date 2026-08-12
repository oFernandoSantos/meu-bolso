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

const serviceWorker = `const CACHE_NAME = "meu-bolso-v3";
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

const pwaHeadBlock = `
    <!-- PWA_HEAD_START -->
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="theme-color" content="#050505" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Meu Bolso" />
    <style>
      html {
        height: -webkit-fill-available;
      }

      html,
      body,
      #root {
        width: 100%;
        height: 100%;
        min-height: 100%;
        height: 100vh;
        min-height: 100vh;
        min-height: 100svh;
        height: 100dvh;
        min-height: 100dvh;
        margin: 0;
        overflow: hidden;
        background: #f6f4ea;
      }

      body {
        position: fixed;
        inset: 0;
        overflow: hidden;
      }
    </style>
    <!-- PWA_HEAD_END -->
`;

const pwaRegisterBlock = `
    <!-- PWA_SW_START -->
    <script>
      if ("serviceWorker" in navigator) {
        window.addEventListener("load", function () {
          navigator.serviceWorker.register("/sw.js");
        });
      }
    </script>
    <!-- PWA_SW_END -->
`;

await mkdir(distDir, { recursive: true });

await copyFile(path.join(publicDir, "favicon.png"), path.join(distDir, "favicon.png"));
await copyFile(path.join(publicDir, "apple-touch-icon.png"), path.join(distDir, "apple-touch-icon.png"));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
await writeFile(serviceWorkerPath, serviceWorker);

const indexHtml = await readFile(indexHtmlPath, "utf8");
const withViewportFit = indexHtml.replace(
  /<meta\s+name="viewport"\s+content="[^"]*"\s*\/?>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
);

const headBlockPattern = /\s*<!-- PWA_HEAD_START -->[\s\S]*?<!-- PWA_HEAD_END -->\s*/;
const swBlockPattern = /\s*<!-- PWA_SW_START -->[\s\S]*?<!-- PWA_SW_END -->\s*/;

const withoutOldHeadBlock = withViewportFit.replace(headBlockPattern, "\n");
const withoutOldSwBlock = withoutOldHeadBlock.replace(swBlockPattern, "\n");

const withManifest = withoutOldSwBlock.replace("</head>", `${pwaHeadBlock}</head>`);
const withServiceWorker = withManifest.replace("</body>", `${pwaRegisterBlock}</body>`);

await writeFile(indexHtmlPath, withServiceWorker);
