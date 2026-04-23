import React, { useEffect, useMemo, useState } from 'react';
import { fetchFunds } from '../lib/api';
import type { FundMeta } from '../types';

interface WatchlistFormProps {
  onSubmit: (data: {
    symbol: string;
    display_name: string;
    fund_id: string;
    drop_threshold_pct: number;
    window_hours: number;
    cooldown_minutes: number;
  }) => Promise<void>;
  loading: boolean;
  existingFundIds?: string[];
}

export const WatchlistForm: React.FC<WatchlistFormProps> = ({
  onSubmit,
  loading,
  existingFundIds = [],
}) => {
  const [funds, setFunds] = useState<FundMeta[]>([]);
  const [fundsLoading, setFundsLoading] = useState(true);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [windowHours, setWindowHours] = useState('24');
  const [cooldown, setCooldown] = useState('180');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchFunds()
      .then((list) => {
        if (!cancelled) setFunds(list);
      })
      .catch(() => {
        if (!cancelled) setFunds([]);
      })
      .finally(() => {
        if (!cancelled) setFundsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableFunds = useMemo(
    () => funds.filter((f) => !existingFundIds.includes(f.id)),
    [funds, existingFundIds]
  );

  useEffect(() => {
    if (!selectedFundId && availableFunds.length > 0) {
      setSelectedFundId(availableFunds[0].id);
    } else if (selectedFundId && !availableFunds.some((f) => f.id === selectedFundId)) {
      setSelectedFundId(availableFunds[0]?.id ?? '');
    }
  }, [availableFunds, selectedFundId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fund = availableFunds.find((f) => f.id === selectedFundId);
    if (!fund) {
      setError('銘柄を選択してください');
      return;
    }

    try {
      await onSubmit({
        symbol: fund.id,
        display_name: fund.nameJa,
        fund_id: fund.id,
        drop_threshold_pct: parseFloat(threshold) || 5,
        window_hours: parseInt(windowHours) || 24,
        cooldown_minutes: parseInt(cooldown) || 180,
      });
      setThreshold('5');
      setWindowHours('24');
      setCooldown('180');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  if (fundsLoading) {
    return <p className="empty-state">銘柄一覧を読み込み中...</p>;
  }

  if (funds.length === 0) {
    return <p className="empty-state">利用可能な銘柄がありません。</p>;
  }

  if (availableFunds.length === 0) {
    return <p className="empty-state">すべての銘柄が監視リストに追加済みです。</p>;
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label>銘柄</label>
          <select
            value={selectedFundId}
            onChange={(e) => setSelectedFundId(e.target.value)}
          >
            {availableFunds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nameJa}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row form-row-3">
        <div className="form-field">
          <label>下落率 (%)</label>
          <input
            type="number"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            min="0.1"
            step="0.1"
          />
        </div>
        <div className="form-field">
          <label>比較期間 (時間)</label>
          <input
            type="number"
            value={windowHours}
            onChange={(e) => setWindowHours(e.target.value)}
            min="1"
          />
        </div>
        <div className="form-field">
          <label>再通知抑制 (分)</label>
          <input
            type="number"
            value={cooldown}
            onChange={(e) => setCooldown(e.target.value)}
            min="0"
          />
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      <button type="submit" className="btn" disabled={loading}>
        {loading ? '追加中...' : '銘柄を追加'}
      </button>
    </form>
  );
};
