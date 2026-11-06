import type { User } from 'firebase/auth';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const API_BASE = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:8000' : '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function resolveApiUrl(path: string): string {
  if (!API_BASE) {
    throw new Error('VITE_API_URL is not configured for this production build.');
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  user?: Pick<User, 'getIdToken'> | null,
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (user) {
    const token = await user.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(resolveApiUrl(path), {
    ...options,
    headers,
  });
}

export async function apiErrorMessage(
  response: Response,
  fallback = 'The request could not be completed.',
): Promise<string> {
  const payload = await response.clone().json().catch(() => ({})) as {
    detail?: string;
    message?: string;
  };
  return payload.detail || payload.message || fallback;
}

export async function apiJson<T>(
  path: string,
  options: RequestInit = {},
  user?: Pick<User, 'getIdToken'> | null,
  fallback?: string,
): Promise<T> {
  const response = await apiFetch(path, options, user);
  if (!response.ok) {
    throw new ApiError(await apiErrorMessage(response, fallback), response.status);
  }
  return response.json() as Promise<T>;
}
