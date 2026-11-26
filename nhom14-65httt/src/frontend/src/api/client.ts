import type {
  LoginRequest,
  SessionTokens,
  TokenResponse,
  User,
} from "../types/auth";

export const AUTH_STORAGE_KEY = "viviet.auth.v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class SessionChangedError extends Error {
  constructor() {
    super("Phiên đăng nhập đã thay đổi. Vui lòng thử lại.");
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof SessionChangedError
    ? error.message
    : "Không thể kết nối máy chủ. Vui lòng thử lại.";
}

type SessionEvent =
  { kind: "login"; user: User } | { kind: "logout" | "external" };
type RequestOptions = RequestInit & { authenticated?: boolean };

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Token chỉ phục vụ gửi API; không dùng dữ liệu localStorage để cấp quyền UI. */
export class ApiClient {
  private tokens: SessionTokens | null = null;
  private generation = 0;
  private listeners = new Set<(event: SessionEvent) => void>();
  private refreshJob: { generation: number; promise: Promise<void> } | null =
    null;
  persisted = true;

  constructor(
    private baseURL: string,
    private fetcher: typeof fetch = (...args) => fetch(...args),
    private storage: Storage | undefined = browserStorage(),
  ) {
    this.baseURL = baseURL.replace(/\/$/, "");
    this.tokens = this.readStorage();
  }

  get hasSession(): boolean {
    return this.tokens !== null;
  }

  get version(): number {
    return this.generation;
  }

  subscribe(listener: (event: SessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SessionEvent) {
    this.listeners.forEach((listener) => listener(event));
  }

  private readStorage(): SessionTokens | null {
    try {
      const raw = this.storage?.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (typeof value !== "object" || value === null) return null;
      const record = value as Record<string, unknown>;
      if (
        typeof record.access_token !== "string" ||
        typeof record.refresh_token !== "string" ||
        !record.access_token.trim() ||
        !record.refresh_token.trim() ||
        record.access_token.length > 4096 ||
        record.refresh_token.length > 4096
      )
        return null;
      return {
        access_token: record.access_token,
        refresh_token: record.refresh_token,
      };
    } catch {
      return null;
    }
  }

  private persist() {
    try {
      if (!this.storage) throw new Error("Storage unavailable");
      if (this.tokens)
        this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(this.tokens));
      else this.storage.removeItem(AUTH_STORAGE_KEY);
      this.persisted = true;
    } catch {
      this.persisted = false;
    }
  }

  syncFromStorage() {
    const next = this.readStorage();
    if (JSON.stringify(next) === JSON.stringify(this.tokens)) return;
    this.generation += 1;
    this.tokens = next;
    this.emit({ kind: next ? "external" : "logout" });
  }

  logout() {
    this.generation += 1;
    this.tokens = null;
    this.persist();
    this.emit({ kind: "logout" });
  }

  async login(payload: LoginRequest): Promise<User> {
    const version = ++this.generation;
    const result = await this.send<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (this.generation !== version) throw new SessionChangedError();
    // Chặn cả request dùng token cũ được gửi trong lúc đăng nhập đang chờ.
    this.generation += 1;
    this.tokens = {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    };
    this.persist();
    this.emit({ kind: "login", user: result.user });
    return result.user;
  }

  private async send<T>(
    path: string,
    options: RequestInit,
    token?: string,
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");
    if (options.body) headers.set("Content-Type", "application/json");
    // Không nhận Authorization do caller truyền; chỉ gửi token của phiên hiện tại.
    headers.delete("Authorization");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
      const response = await this.fetcher(this.baseURL + path, {
        ...options,
        headers,
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError(
          body?.error?.message ||
            "Không thể hoàn tất yêu cầu. Vui lòng thử lại.",
          response.status,
          body?.error?.code || `HTTP_${response.status}`,
        );
      }
      return body as T;
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  private refresh(): Promise<void> {
    const version = this.generation;
    if (this.refreshJob?.generation === version) return this.refreshJob.promise;
    const refreshToken = this.tokens?.refresh_token;
    const promise = (async () => {
      try {
        if (!refreshToken)
          throw new ApiError("Vui lòng đăng nhập lại.", 401, "UNAUTHENTICATED");
        const result = await this.send<TokenResponse>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (version !== this.generation) throw new SessionChangedError();
        this.tokens = {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        };
        this.persist();
      } catch (error) {
        if (
          version === this.generation &&
          error instanceof ApiError &&
          (error.status === 401 || error.status === 422)
        )
          this.logout();
        throw error;
      }
    })();
    this.refreshJob = { generation: version, promise };
    void promise
      .finally(() => {
        if (this.refreshJob?.promise === promise) this.refreshJob = null;
      })
      .catch(() => {});
    return promise;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { authenticated = true, ...init } = options;
    if (!authenticated) return this.send<T>(path, init);
    const version = this.generation;
    const token = this.tokens?.access_token;
    if (!token)
      throw new ApiError("Vui lòng đăng nhập.", 401, "UNAUTHENTICATED");
    try {
      const result = await this.send<T>(path, init, token);
      if (version !== this.generation) throw new SessionChangedError();
      return result;
    } catch (error) {
      if (version !== this.generation) throw new SessionChangedError();
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      if (token === this.tokens?.access_token) await this.refresh();
      if (version !== this.generation) throw new SessionChangedError();
      try {
        const result = await this.send<T>(
          path,
          init,
          this.tokens?.access_token,
        );
        if (version !== this.generation) throw new SessionChangedError();
        return result;
      } catch (retryError) {
        if (version !== this.generation) throw new SessionChangedError();
        if (retryError instanceof ApiError && retryError.status === 401)
          this.logout();
        throw retryError;
      }
    }
  }
}

export const apiClient = new ApiClient(
  import.meta.env.VITE_API_BASE_URL || "/api/v1",
);
