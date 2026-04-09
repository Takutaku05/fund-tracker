import { useState, useEffect, useCallback } from 'react';
import { fetchHistory } from '../lib/api';
import type { NavHistoryRecord, Period } from '../types';

interface HistoryDataState {
  history: NavHistoryRecord[];
  period: Period;
  setPeriod: (period: Period) => void;
  loading: boolean;
  error: string | null;
}

export function useHistoryData(initialPeriod: Period = 'month'): HistoryDataState {
  const [history, setHistory] = useState<NavHistoryRecord[]>([]);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchHistory(period);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '履歴データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return { history, period, setPeriod, loading, error };
}
