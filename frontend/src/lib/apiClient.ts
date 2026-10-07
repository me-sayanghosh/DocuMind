import { useAuthStore } from "./auth";

const BASE_URL = "/api/v1";

export class ApiError extends Error {
  status: number;
  code: string;
  detail: string;

  constructor(status: number, code: string, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

// Single-flight promise mutex to deduplicate concurrent refresh calls
let refreshPromise: Promise<string | null> | null = null;

export async function silentRefreshToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });

      if (!refreshRes.ok) {
        return null;
      }

      const refreshData = await refreshRes.json();
      const newToken = refreshData.access_token;
      if (newToken) {
        useAuthStore.getState().setAccessToken(newToken);
      }
      return newToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;
  const store = useAuthStore.getState();

  const headers = new Headers(options.headers || {});
  if (store.accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${store.accessToken}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    credentials: options.credentials || "include",
    ...options,
    headers,
  });

  // Handle 401 Refresh Token rotation
  if (response.status === 401 && !endpoint.includes("/auth/")) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiClient<T>(endpoint, options));
    }

    isRefreshing = true;

    try {
      const newToken = await silentRefreshToken();
      if (!newToken) {
        throw new Error("Refresh failed");
      }

      processQueue(null, newToken);

      // Retry original request with new token
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("Authorization", `Bearer ${newToken}`);
      if (!retryHeaders.has("Content-Type") && !(options.body instanceof FormData)) {
        retryHeaders.set("Content-Type", "application/json");
      }

      const retryResponse = await fetch(url, {
        credentials: options.credentials || "include",
        ...options,
        headers: retryHeaders,
      });
      if (!retryResponse.ok) {
        const errData = await retryResponse.json().catch(() => ({}));
        throw new ApiError(
          retryResponse.status,
          errData.code || "REQUEST_FAILED",
          errData.detail || "Request failed"
        );
      }

      if (retryResponse.status === 204) return {} as T;
      return (await retryResponse.json()) as T;
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      store.logout();
      throw new ApiError(401, "UNAUTHORIZED", "Session expired. Please log in again.");
    } finally {
      isRefreshing = false;
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.code || "ERROR",
      errorData.detail || errorData.title || "An unexpected error occurred"
    );
  }

  return response.json();
}
