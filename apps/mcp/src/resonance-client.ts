const API_BASE_URL = process.env.RESONANCE_API_URL ?? "http://localhost:3001";

export class ResonanceApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
  }
}

/** Thin HTTP client the MCP tools use to call the Resonance API on the caller's behalf. */
export class ResonanceClient {
  constructor(private readonly bearerToken: string) {}

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const problem = (await res.json().catch(() => null)) as {
        detail?: string;
        title?: string;
      } | null;
      throw new ResonanceApiError(res.status, problem?.detail ?? problem?.title ?? res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>("POST", path, body);
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>("PATCH", path, body);
  }
}
