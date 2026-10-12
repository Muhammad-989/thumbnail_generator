import { PromptPack } from './types/creative';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export interface GenerationJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  statusUrl?: string;
  prompt: string;
  createdAt?: string;
  url?: string;
  completedAt?: string;
  error?: string;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export function getCategories(): Promise<string[]> {
  return request<string[]>('/api/categories');
}

export function getPromptPacks(filters?: {
  collection?: string;
  mediaType?: 'image' | 'video';
}): Promise<PromptPack[]> {
  const params = new URLSearchParams();
  if (filters?.collection && filters.collection !== 'All prompts') {
    params.set('collection', filters.collection);
  }
  if (filters?.mediaType) params.set('mediaType', filters.mediaType);
  const query = params.toString();
  return request<PromptPack[]>(`/api/prompts${query ? `?${query}` : ''}`);
}

export function getPromptPack(id: string): Promise<PromptPack> {
  return request<PromptPack>(`/api/prompts/${id}`);
}

export function getFavorites(): Promise<string[]> {
  return request<string[]>('/api/favorites');
}

export function addFavorite(id: string): Promise<{ id: string; saved: true }> {
  return request<{ id: string; saved: true }>(`/api/favorites/${id}`, {
    method: 'PUT',
  });
}

export function removeFavorite(id: string): Promise<{ id: string; saved: false }> {
  return request<{ id: string; saved: false }>(`/api/favorites/${id}`, {
    method: 'DELETE',
  });
}

export function createImageJob(
  prompt: string,
  width: number,
  height: number,
): Promise<GenerationJobResponse> {
  return request<GenerationJobResponse>('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width, height, steps: 10, seed: 42 }),
  });
}

export function getImageJob(statusUrl: string): Promise<GenerationJobResponse> {
  return request<GenerationJobResponse>(
    statusUrl.startsWith('http') ? statusUrl.replace(API_BASE_URL, '') : statusUrl,
  );
}

export function resolveApiUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

// Kept as a typed boundary for the future catalog endpoint.
export function mapPromptCatalog(data: PromptPack[]): PromptPack[] {
  return data;
}
