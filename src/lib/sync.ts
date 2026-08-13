import type { Database } from "./types";

const DEFAULT_API_BASE = "/api";
let syncTimer: ReturnType<typeof setTimeout> | null = null;

interface RemoteSnapshotResponse {
  database: Database | null;
  updatedAt: string | null;
}

function apiBaseUrl(): string {
  const envUrl =
    typeof import.meta !== "undefined"
      ? (import.meta.env.VITE_API_BASE_URL as string | undefined)
      : undefined;
  return envUrl?.trim() || DEFAULT_API_BASE;
}

function authHeaders(db: Database): HeadersInit | null {
  const token = db.settings.auth.access_token;
  if (!db.settings.auth.session_active || !token) return null;

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function hasMeaningfulLocalData(db: Database): boolean {
  return db.expenses.length > 0 || db.cards.length > 0 || db.categories.length > 12;
}

export async function pullRemoteDatabase(db: Database): Promise<RemoteSnapshotResponse | null> {
  if (typeof window === "undefined") return null;
  const headers = authHeaders(db);
  if (!headers) return null;

  const response = await fetch(`${apiBaseUrl()}/sync/database`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar sincronizacao remota (${response.status})`);
  }

  const payload = await response.json();
  return {
    database: payload?.dados?.database ?? null,
    updatedAt: payload?.dados?.updatedAt ?? null,
  };
}

export async function pushRemoteDatabase(db: Database): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const headers = authHeaders(db);
  if (!headers) return null;

  const response = await fetch(`${apiBaseUrl()}/sync/database`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ database: db }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao salvar sincronizacao remota (${response.status})`);
  }

  const payload = await response.json();
  return payload?.dados?.updatedAt ?? null;
}

export async function bootstrapRemoteDatabase(db: Database): Promise<Database | null> {
  const remote = await pullRemoteDatabase(db);
  if (!remote) return null;

  if (!remote.database) {
    if (hasMeaningfulLocalData(db)) {
      const updatedAt = await pushRemoteDatabase(db);
      return {
        ...db,
        settings: {
          ...db.settings,
          sync: {
            remote_updated_at: updatedAt,
            last_local_change_at: db.settings.sync?.last_local_change_at ?? null,
          },
        },
      };
    }
    return null;
  }

  const localRemoteUpdatedAt = db.settings.sync?.remote_updated_at;
  const lastLocalChangeAt = db.settings.sync?.last_local_change_at;
  const remoteIsNewer =
    !!remote.updatedAt &&
    (!localRemoteUpdatedAt ||
      new Date(remote.updatedAt).getTime() > new Date(localRemoteUpdatedAt).getTime());
  const localHasUnsyncedChanges =
    !!lastLocalChangeAt &&
    (!localRemoteUpdatedAt ||
      new Date(lastLocalChangeAt).getTime() > new Date(localRemoteUpdatedAt).getTime());

  if (localHasUnsyncedChanges && !remoteIsNewer) {
    const updatedAt = await pushRemoteDatabase(db);
    return {
      ...db,
      settings: {
        ...db.settings,
        sync: {
          remote_updated_at: updatedAt,
          last_local_change_at: db.settings.sync?.last_local_change_at ?? null,
        },
      },
    };
  }

  if (remoteIsNewer || !hasMeaningfulLocalData(db)) {
    return {
      ...remote.database,
      settings: {
        ...remote.database.settings,
        auth: db.settings.auth,
        sync: {
          remote_updated_at: remote.updatedAt,
          last_local_change_at: db.settings.sync?.last_local_change_at ?? null,
        },
      },
    };
  }

  return null;
}

export function queueRemoteDatabasePush(
  db: Database,
  onSynced?: (updatedAt: string | null) => void,
): void {
  if (typeof window === "undefined") return;
  if (!db.settings.auth.session_active || !db.settings.auth.access_token) return;

  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(async () => {
    syncTimer = null;
    try {
      const updatedAt = await pushRemoteDatabase(db);
      onSynced?.(updatedAt);
    } catch {
      // Mantem operacao local mesmo se a sincronizacao remota falhar.
    }
  }, 800);
}
