import { useState, useEffect, useCallback } from 'react';
import { fetchLatestNav, fetchAlltimePeak } from '../lib/api';
import type { LatestNavData, AlltimePeakData } from '../types';

interface NavDataState {
  latestNav: LatestNavData | null;
  alltimePeak: AlltimePeakData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNavData(fundId?: string): NavDataState {
  const [latestNav, setLatestNav] = useState<LatestNavData | null>(null);
  const [alltimePeak, setAlltimePeak] = useState<AlltimePeakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [navData, peakData] = await Promise.all([
        fetchLatestNav(fundId),
        fetchAlltimePeak(fundId),
      ]);
      setLatestNav(navData);
      setAlltimePeak(peakData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => {
    load();
  }, [load]);

  return { latestNav, alltimePeak, loading, error, refresh: load };
}
