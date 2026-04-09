import { useState, useEffect, useCallback } from 'react';
import { fetchLatestNav, fetchValuation } from '../lib/api';
import type { LatestNavData, ValuationData } from '../types';

interface NavDataState {
  latestNav: LatestNavData | null;
  valuation: ValuationData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNavData(): NavDataState {
  const [latestNav, setLatestNav] = useState<LatestNavData | null>(null);
  const [valuation, setValuation] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [navData, valData] = await Promise.all([
        fetchLatestNav(),
        fetchValuation(),
      ]);
      setLatestNav(navData);
      setValuation(valData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { latestNav, valuation, loading, error, refresh: load };
}
