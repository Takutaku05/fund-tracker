import type { ApiResponse, LatestNavData, ValuationData, NavHistoryRecord, Period } from '../types';

/**
 * API ベース URL
 * 開発時は Vite proxy 経由、本番時は Worker の URL を指定
 */
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success || !json.data) {
    throw new Error(json.error || 'Unknown error');
  }

  return json.data;
}

export function fetchLatestNav(): Promise<LatestNavData> {
  return fetchApi<LatestNavData>('/api/nav/latest');
}

export function fetchValuation(): Promise<ValuationData> {
  return fetchApi<ValuationData>('/api/nav/valuation');
}

export function fetchHistory(period: Period): Promise<NavHistoryRecord[]> {
  return fetchApi<NavHistoryRecord[]>(`/api/history?period=${period}`);
}

export function fetchHealth(): Promise<{ status: string; records: number; timestamp: string }> {
  return fetchApi('/api/health');
}
