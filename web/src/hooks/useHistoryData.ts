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
  currentNav?: number
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
      const data = await fetchHistory(period);
      setHistory(data);
      setDrawdown(currentNav != null ? calculateDrawdown(data, currentNav) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '履歴データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [period, currentNav]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, drawdown, period, setPeriod, loading, error };
}
