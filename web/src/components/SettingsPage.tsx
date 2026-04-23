import React, { useEffect, useState, useCallback } from 'react';
import type { WatchlistItem, NotificationChannelItem } from '../types';
import {
  fetchWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  fetchChannels,
  createChannel,
  updateChannel,
  testChannel,
} from '../lib/api';
import { WatchlistForm } from './WatchlistForm';
import { WatchlistList } from './WatchlistList';
import { WebhookSettings } from './WebhookSettings';

export const SettingsPage: React.FC = () => {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [channels, setChannels] = useState<NotificationChannelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [w, c] = await Promise.all([fetchWatchlists(), fetchChannels()]);
      setWatchlists(w);
      setChannels(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddWatchlist = async (data: {
    symbol: string;
    display_name: string;
    fund_id: string;
    drop_threshold_pct: number;
    window_hours: number;
    cooldown_minutes: number;
  }) => {
    setMutating(true);
    setError('');
    try {
      const created = await createWatchlist(data);
      setWatchlists((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '銘柄の追加に失敗しました');
    } finally {
      setMutating(false);
    }
  };

  const handleToggleWatchlist = async (id: string, enabled: boolean) => {
    setMutating(true);
    setError('');
    try {
      const updated = await updateWatchlist(id, { enabled });
      setWatchlists((prev) => prev.map((w) => (w.id === id ? updated : w)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setMutating(false);
    }
  };

  const handleDeleteWatchlist = async (id: string) => {
    setMutating(true);
    setError('');
    try {
      await deleteWatchlist(id);
      setWatchlists((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setMutating(false);
    }
  };

  const handleAddChannel = async (webhookUrl: string) => {
    setMutating(true);
    setError('');
    try {
      const created = await createChannel({ webhook_url: webhookUrl });
      setChannels((prev) => [...prev, created]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Webhookの追加に失敗しました');
    } finally {
      setMutating(false);
    }
  };

  const handleTestChannel = async (id: string) => {
    setError('');
    try {
      await testChannel(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'テスト送信に失敗しました');
    }
  };

  const handleToggleChannel = async (id: string, enabled: boolean) => {
    setMutating(true);
    setError('');
    try {
      const updated = await updateChannel(id, { enabled });
      setChannels((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setMutating(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p>設定を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      {error && (
        <div className="error" style={{ marginBottom: '1.5rem' }}>
          <p>{error}</p>
          <button className="btn" onClick={loadData}>再試行</button>
        </div>
      )}

      <section className="card-section" style={{ marginBottom: '1.5rem' }}>
        <div className="card-section-header">Discord 通知設定</div>
        <WebhookSettings
          channels={channels}
          onAdd={handleAddChannel}
          onTest={handleTestChannel}
          onToggle={handleToggleChannel}
          loading={mutating}
        />
      </section>

      <section className="card-section">
        <div className="card-section-header">監視銘柄</div>
        <WatchlistForm
          onSubmit={handleAddWatchlist}
          loading={mutating}
          existingFundIds={watchlists
            .map((w) => w.fundId)
            .filter((id): id is string => !!id)}
        />
        <div style={{ marginTop: '1.5rem' }}>
          <WatchlistList
            items={watchlists}
            onToggle={handleToggleWatchlist}
            onDelete={handleDeleteWatchlist}
            loading={mutating}
          />
        </div>
      </section>
    </div>
  );
};
