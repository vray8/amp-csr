export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(err?.message ?? 'Request failed', res.status, err?.code ?? 'UNKNOWN', err?.fieldErrors);
  }
  return body.data as T;
}
