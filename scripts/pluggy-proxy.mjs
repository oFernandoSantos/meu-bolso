import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.PLUGGY_PROXY_PORT || 8787);
const HOST = process.env.PLUGGY_PROXY_HOST || "0.0.0.0";
const API_BASE_URL = "https://api.pluggy.ai";
const ENV_FILE_PATH = resolve(process.cwd(), ".env.local");

loadEnvFile(".env.local");

let clientId = process.env.PLUGGY_CLIENT_ID || "";
let clientSecret = process.env.PLUGGY_CLIENT_SECRET || "";

if (!clientId || !clientSecret) {
  console.error("Missing PLUGGY_CLIENT_ID or PLUGGY_CLIENT_SECRET in .env.local");
}

let cachedApiKey = null;
let cachedApiKeyExpiresAt = 0;

function loadEnvFile(name) {
  const filePath = resolve(process.cwd(), name);
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function persistEnvFile() {
  const lines = [
    `PLUGGY_CLIENT_ID=${clientId}`,
    `PLUGGY_CLIENT_SECRET=${clientSecret}`,
    `PLUGGY_PROXY_PORT=${PORT}`,
    `PLUGGY_PROXY_HOST=${HOST}`,
  ];
  writeFileSync(ENV_FILE_PATH, `${lines.join("\n")}\n`, "utf8");
}

function maskClientId(value) {
  if (!value) return null;
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function getConfigStatus() {
  return {
    configured: Boolean(clientId && clientSecret),
    clientIdMasked: maskClientId(clientId),
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

async function pluggyRequest(path, init = {}, apiKeyOverride) {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json");
  headers.set("accept", "application/json");

  if (apiKeyOverride) {
    headers.set("x-api-key", apiKeyOverride);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || `Pluggy error ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function getApiKey() {
  if (!clientId || !clientSecret) {
    throw new Error("Pluggy credentials not configured in local proxy");
  }

  if (cachedApiKey && Date.now() < cachedApiKeyExpiresAt) return cachedApiKey;

  const auth = await pluggyRequest("/auth", {
    method: "POST",
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  cachedApiKey =
    auth?.apiKey || auth?.accessToken || auth?.access_token || auth?.token || auth?.apikey;
  cachedApiKeyExpiresAt = Date.now() + 1000 * 60 * 100;

  if (!cachedApiKey) {
    throw new Error("Pluggy auth response missing API key");
  }

  return cachedApiKey;
}

async function getConnectToken(body) {
  const apiKey = await getApiKey();
  const data = await pluggyRequest(
    "/connect_token",
    {
      method: "POST",
      body: JSON.stringify(body || {}),
    },
    apiKey,
  );

  return {
    accessToken: data?.accessToken || data?.access_token || data?.token,
  };
}

async function getItem(itemId) {
  const apiKey = await getApiKey();
  return pluggyRequest(`/items/${itemId}`, { method: "GET" }, apiKey);
}

async function listAccounts(itemId) {
  const apiKey = await getApiKey();
  const data = await pluggyRequest(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    { method: "GET" },
    apiKey,
  );
  return data?.results || data || [];
}

async function listTransactions(accountId) {
  const apiKey = await getApiKey();
  const all = [];
  let nextPath = `/v2/transactions?accountId=${encodeURIComponent(accountId)}`;

  while (nextPath) {
    const data = await pluggyRequest(nextPath, { method: "GET" }, apiKey);
    all.push(...(data?.results || []));
    nextPath = data?.next || null;
  }

  return all;
}

async function listConnectors() {
  const apiKey = await getApiKey();
  const data = await pluggyRequest("/connectors?sandbox=true", { method: "GET" }, apiKey);
  return data?.results || data || [];
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: "Missing URL" });
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  try {
    if (request.url === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && request.url === "/api/pluggy/config/status") {
      sendJson(response, 200, getConfigStatus());
      return;
    }

    if (request.method === "POST" && request.url === "/api/pluggy/config/save") {
      const body = await readJsonBody(request);
      const nextClientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
      const nextClientSecret =
        typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";

      if (!nextClientId || !nextClientSecret) {
        sendJson(response, 400, { error: "Client ID and Client Secret are required" });
        return;
      }

      clientId = nextClientId;
      clientSecret = nextClientSecret;
      cachedApiKey = null;
      cachedApiKeyExpiresAt = 0;
      persistEnvFile();
      sendJson(response, 200, getConfigStatus());
      return;
    }

    if (request.method === "POST" && request.url === "/api/pluggy/connect-token") {
      const body = await readJsonBody(request);
      const data = await getConnectToken(body);
      sendJson(response, 200, data);
      return;
    }

    if (request.method === "POST" && request.url === "/api/pluggy/item") {
      const body = await readJsonBody(request);
      const item = await getItem(body.itemId);
      sendJson(response, 200, { item });
      return;
    }

    if (request.method === "POST" && request.url === "/api/pluggy/sync") {
      const body = await readJsonBody(request);
      const item = await getItem(body.itemId);
      const accounts = await listAccounts(body.itemId);
      const transactionsByAccount = {};

      for (const account of accounts) {
        transactionsByAccount[account.id] = await listTransactions(account.id);
      }

      sendJson(response, 200, {
        item,
        accounts,
        transactionsByAccount,
      });
      return;
    }

    if (request.method === "POST" && request.url === "/api/pluggy/sandbox-connector") {
      const connectors = await listConnectors();
      const sandboxConnector =
        connectors.find(
          (connector) => connector?.isSandbox && /pluggy bank/i.test(connector?.name || ""),
        ) ??
        connectors.find((connector) => connector?.isSandbox === true) ??
        null;
      sendJson(response, 200, { connector: sandboxConnector });
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Pluggy proxy listening on http://${HOST}:${PORT}`);
});
