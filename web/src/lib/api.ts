import type {
  ApiResponse,
  LatestNavData,
  AlltimePeakData,
  HistoryPayload,
  Period,
  FundMeta,
  WatchlistItem,
  WatchlistInput,
  NotificationChannelItem,
  NotificationChannelInput,
} from '../types';

/**
 * API ベース URL
 * 開発時は Vite proxy 経由、本番時は Worker の URL を指定
 */
const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as ApiResponse<unknown>;
    throw new Error((body as ApiResponse<unknown>).error || `API error: ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.error || 'Unknown error');
  }

  return json.data as T;
}

async function mutateApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  return fetchApi<T>(path, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function withFund(path: string, fundId?: string): string {
  if (!fundId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}fundId=${encodeURIComponent(fundId)}`;
}

export function fetchLatestNav(fundId?: string): Promise<LatestNavData> {
  return fetchApi<LatestNavData>(withFund('/api/nav/latest', fundId));
}

export function fetchAlltimePeak(fundId?: string): Promise<AlltimePeakData> {
  return fetchApi<AlltimePeakData>(withFund('/api/nav/alltime-peak', fundId));
}

export function fetchHistory(period: Period, fundId?: string): Promise<HistoryPayload> {
  return fetchApi<HistoryPayload>(withFund(`/api/history?period=${period}`, fundId));
}

export function fetchFunds(): Promise<FundMeta[]> {
  return fetchApi<{ funds: FundMeta[] }>('/api/funds').then(r => r.funds);
}

export function fetchHealth(): Promise<{ status: string; records: number; timestamp: string }> {
  return fetchApi('/api/health');
}

// --- Watchlists ---

export function fetchWatchlists(): Promise<WatchlistItem[]> {
  return fetchApi<WatchlistItem[]>('/api/settings/watchlists');
}

export function createWatchlist(input: WatchlistInput): Promise<WatchlistItem> {
  return mutateApi<WatchlistItem>('POST', '/api/settings/watchlists', input);
}

export function updateWatchlist(id: string, input: Partial<WatchlistInput>): Promise<WatchlistItem> {
  return mutateApi<WatchlistItem>('PATCH', `/api/settings/watchlists/${id}`, input);
}

export function deleteWatchlist(id: string): Promise<void> {
  return mutateApi<void>('DELETE', `/api/settings/watchlists/${id}`);
}

// --- Notification Channels ---

export function fetchChannels(): Promise<NotificationChannelItem[]> {
  return fetchApi<NotificationChannelItem[]>('/api/settings/notification-channels');
}

export function createChannel(input: NotificationChannelInput): Promise<NotificationChannelItem> {
  return mutateApi<NotificationChannelItem>('POST', '/api/settings/notification-channels', input);
}

export function updateChannel(id: string, input: Partial<NotificationChannelInput>): Promise<NotificationChannelItem> {
  return mutateApi<NotificationChannelItem>('PATCH', `/api/settings/notification-channels/${id}`, input);
}

export function testChannel(id: string): Promise<{ sent: boolean }> {
  return mutateApi<{ sent: boolean }>('POST', `/api/settings/notification-channels/${id}/test`);
}
