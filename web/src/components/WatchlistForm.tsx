import React, { useState } from 'react';

interface WatchlistFormProps {
  onSubmit: (data: {
    symbol: string;
    display_name: string;
    drop_threshold_pct: number;
    window_hours: number;
    cooldown_minutes: number;
  }) => Promise<void>;
  loading: boolean;
}

export const WatchlistForm: React.FC<WatchlistFormProps> = ({ onSubmit, loading }) => {
  const [symbol, setSymbol] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [threshold, setThreshold] = useState('5');
  const [windowHours, setWindowHours] = useState('24');
  const [cooldown, setCooldown] = useState('180');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!symbol.trim() || !displayName.trim()) {
      setError('銘柄コードと表示名は必須です');
      return;
    }

    try {
      await onSubmit({
        symbol: symbol.trim(),
        display_name: displayName.trim(),
        drop_threshold_pct: parseFloat(threshold) || 5,
        window_hours: parseInt(windowHours) || 24,
        cooldown_minutes: parseInt(cooldown) || 180,
      });
      setSymbol('');
      setDisplayName('');
      setThreshold('5');
      setWindowHours('24');
      setCooldown('180');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label>銘柄コード</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="例: EMAXIS_AC"
          />
        </div>
        <div className="form-field">
          <label>表示名</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="例: eMAXIS Slim 全世界株式"
          />
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
