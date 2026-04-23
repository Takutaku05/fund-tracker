import React from 'react';
import type { WatchlistItem } from '../types';

interface WatchlistListProps {
  items: WatchlistItem[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

function formatThreshold(pct: number): string {
  return pct > 0 ? `${pct}%` : '-';
}

export const WatchlistList: React.FC<WatchlistListProps> = ({
  items,
  onToggle,
  onDelete,
  loading,
}) => {
  if (items.length === 0) {
    return <p className="empty-state">監視銘柄がまだありません。上のフォームから追加してください。</p>;
  }

  return (
    <div className="watchlist-table">
      <div className="watchlist-header">
        <span>銘柄</span>
        <span>下落率</span>
        <span>上昇率</span>
        <span>比較期間</span>
        <span>状態</span>
        <span></span>
      </div>
      {items.map((item) => (
        <div key={item.id} className={`watchlist-row ${!item.enabled ? 'disabled' : ''}`}>
          <span className="watchlist-symbol">
            <strong>{item.symbol}</strong>
            <small>{item.displayName}</small>
          </span>
          <span>{formatThreshold(item.dropThresholdPct)}</span>
          <span>{formatThreshold(item.riseThresholdPct)}</span>
          <span>{item.windowDays}日</span>
          <span>
            <button
              className={`toggle-btn ${item.enabled ? 'on' : 'off'}`}
              onClick={() => onToggle(item.id, !item.enabled)}
              disabled={loading}
            >
              {item.enabled ? 'ON' : 'OFF'}
            </button>
          </span>
          <span>
            <button
              className="delete-btn"
              onClick={() => onDelete(item.id)}
              disabled={loading}
            >
              削除
            </button>
          </span>
        </div>
      ))}
    </div>
  );
};
