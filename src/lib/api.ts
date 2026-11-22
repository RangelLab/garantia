import type { SessionData, User } from "../types";

declare global {
  interface Window {
    GARANTIA_SUPABASE_CONFIG?: {
      url?: string;
      publishableKey?: string;
    };
  }
}

const SESSION_KEY = "garantia-session-v1";

function getApiUrl(): string {
  const base = (window.GARANTIA_SUPABASE_CONFIG?.url || "").replace(/\/$/, "");
  return `${base}/functions/v1/garantia-api`;
}

export function isApiConfigured(): boolean {
  return getApiUrl().startsWith("https://");
}

let accessToken = "";
let refreshToken = "";

export function loadSavedSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionData>;
    if (parsed?.accessToken && parsed?.refreshToken) {
      accessToken = parsed.accessToken;
      refreshToken = parsed.refreshToken;
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        user: parsed.user as User,
      };
    }
  } catch {
    // ignore malformed storage
  }
  return null;
}

export function saveTokens(data: {
  access_token: string;
  refresh_token: string;
  user: User;
}): void {
  accessToken = data.access_token;
  refreshToken = data.refresh_token;
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      accessToken,
      refreshToken,
      user: data.user,
    })
  );
}

export function updateStoredUser(user: User): void {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as SessionData;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...parsed, user }));
  } catch {
    // ignore
  }
}

export function clearTokens(): void {
  accessToken = "";
  refreshToken = "";
  localStorage.removeItem(SESSION_KEY);
}

export function getRefreshToken(): string {
  return refreshToken;
}

export async function api<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
  authenticated = true
): Promise<T> {
  const apiUrl = getApiUrl();
  if (!apiUrl.startsWith("https://")) {
    throw new Error("A configuração da API do Garantia não foi carregada.");
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authenticated && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let response = await fetch(apiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...payload }),
  });

  let data = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (response.status === 401 && authenticated && refreshToken && action !== "refresh") {
    const refreshed = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", refresh_token: refreshToken }),
    });
    const next = (await refreshed.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      user?: User;
    };
    if (refreshed.ok && next.access_token && next.refresh_token && next.user) {
      saveTokens({
        access_token: next.access_token,
        refresh_token: next.refresh_token,
        user: next.user,
      });
      headers.Authorization = `Bearer ${accessToken}`;
      response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ action, ...payload }),
      });
      data = (await response.json().catch(() => ({}))) as T & { error?: string };
    } else {
      clearTokens();
    }
  }

  if (!response.ok) {
    throw new Error(data.error || "Falha na comunicação com o Garantia.");
  }

  return data;
}

export async function refreshSession(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const data = await api<{
      access_token: string;
      refresh_token: string;
      user: User;
    }>("refresh", { refresh_token: refreshToken }, false);
    saveTokens(data);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export function friendlyError(error: unknown, fallback?: string): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/row-level security|permission denied/i.test(message)) {
    return "Sua conta não tem permissão para acessar este item.";
  }
  if (/fetch|network|failed to fetch/i.test(message)) {
    return "Sem conexão com o servidor. Confira a internet e tente novamente.";
  }
  return message || fallback || "Ocorreu um erro inesperado.";
}

export function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type });
}
