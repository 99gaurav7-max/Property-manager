export function formatTitleCaseName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .split(/\s+/)
    .map(word => {
      if (!word) return '';
      return word
        .split('-')
        .map(subWord => subWord ? subWord.charAt(0).toUpperCase() + subWord.slice(1).toLowerCase() : '')
        .join('-');
    })
    .join(' ');
}

// In production (Vercel), set VITE_API_URL to the Railway backend URL.
// In development, Vite proxies /api to the backend so this is empty.
export const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('noble_session_token');
  const headers = {
    ...(options.headers || {}),
    'Content-Type': 'application/json',
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

