export interface BackendRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface BackendResponse {
  setHeader(name: string, value: string): BackendResponse;
  status(code: number): BackendResponse;
  json(payload: unknown): BackendResponse;
  send(payload: string | Buffer): BackendResponse;
  redirect(status: number, url: string): BackendResponse;
}

export function getQueryString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

export function getBodyString(body: unknown, key: string): string {
  if (typeof body !== 'object' || body === null || !(key in body)) {
    return '';
  }

  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}