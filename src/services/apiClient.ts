// LensIQ API Client for FastAPI Backend Connection

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  public status: number;
  public details: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const getAuthToken = (): string | null => {
  try {
    // 1. Check local-first auth token
    const localToken = localStorage.getItem('lensiq_auth_token');
    if (localToken) return localToken;

    // 2. Check Supabase session in localStorage
    const supabaseSession = localStorage.getItem('lensiq_supabase_token');
    if (supabaseSession) return supabaseSession;

    // 2. Check standard supabase key format
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed?.access_token) return parsed.access_token;
        }
      }
    }
  } catch (err) {
    console.warn('Error reading auth token:', err);
  }
  return null;
};

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = 'Request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail?.message || errorJson.detail || errorJson.message || response.statusText;
    } catch {
      errorDetail = await response.text();
    }
    throw new ApiError(errorDetail, response.status);
  }

  // Handle blob or text if required
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export async function fetchBlob(endpoint: string): Promise<Blob> {
  const token = getAuthToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ApiError(`Failed to fetch file: ${response.statusText}`, response.status);
  }
  return await response.blob();
}

export async function streamChatSse(
  endpoint: string,
  body: any,
  onEvent: (event: { type: string; content?: string; citations?: any[]; provider?: string; messageId?: string; error?: string }) => void,
  onError: (err: Error) => void,
  onComplete: () => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      let msg = 'Stream error';
      try {
        const j = await response.json();
        msg = j.detail?.message || j.detail || response.statusText;
      } catch {
        msg = await response.text();
      }
      throw new ApiError(msg, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body reader unavailable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const block of lines) {
        const trimmed = block.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.replace(/^data:\s*/, '');
          try {
            const data = JSON.parse(jsonStr);
            onEvent(data);
          } catch (e) {
            console.error('Failed to parse SSE JSON block:', jsonStr, e);
          }
        }
      }
    }

    onComplete();
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log('Stream generation aborted by user.');
    } else {
      onError(err);
    }
  }
}

