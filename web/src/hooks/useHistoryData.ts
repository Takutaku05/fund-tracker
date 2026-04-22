import { useState, useEffect, useCallback } from 'react';
import { fetchHistory } from '../lib/api';
import { calculateDrawdown } from '../lib/drawdown';
import type { NavHistoryRecord, Period, DrawdownResult } from '../types';

interface HistoryDataState {
  history: NavHistoryRecord[];
  drawdown: DrawdownResult | null;
  period: Period;
  setPeriod: (period: Period) => void;
  loading: boolean;
  error: string | null;
}

export function useHistoryData(
  initialPeriod: Period = 'month',
  currentNav?: number,
  fundId?: string
): HistoryDataState {
  const [history, setHistory] = useState<NavHistoryRecord[]>([]);
  const [drawdown, setDrawdown] = useState<DrawdownResult | null>(null);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchHistory(period, fundId);
      setHistory(payload.rows);
      setDrawdown(currentNav != null ? calculateDrawdown(payload.rows, currentNav) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '履歴データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [period, currentNav, fundId]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, drawdown, period, setPeriod, loading, error };
}
