import React, { useState } from 'react';
import type { NotificationChannelItem } from '../types';

interface WebhookSettingsProps {
  channels: NotificationChannelItem[];
  onAdd: (webhookUrl: string) => Promise<void>;
  onTest: (id: string) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => void;
  loading: boolean;
}

export const WebhookSettings: React.FC<WebhookSettingsProps> = ({
  channels,
  onAdd,
  onTest,
  onToggle,
  loading,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [error, setError] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!webhookUrl.trim()) {
      setError('Webhook URLを入力してください');
      return;
    }

    if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
        !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      setError('Discord Webhook URLの形式が正しくありません');
      return;
    }

    try {
      await onAdd(webhookUrl.trim());
      setWebhookUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      await onTest(id);
      setTestResult({ id, success: true });
    } catch {
      setTestResult({ id, success: false });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div>
      <form className="settings-form" onSubmit={handleAdd}>
        <div className="form-field">
          <label>Discord Webhook URL</label>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="input-wide"
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? '追加中...' : 'Webhookを追加'}
        </button>
      </form>

      {channels.length > 0 && (
        <div className="channel-list">
          {channels.map((ch) => (
            <div key={ch.id} className={`channel-row ${!ch.enabled ? 'disabled' : ''}`}>
              <span className="channel-type">Discord Webhook</span>
              <span className="channel-status">
                {ch.lastTestedAt ? `最終テスト: ${new Date(ch.lastTestedAt).toLocaleString('ja-JP')}` : '未テスト'}
              </span>
              <button
                className={`toggle-btn ${ch.enabled ? 'on' : 'off'}`}
                onClick={() => onToggle(ch.id, !ch.enabled)}
                disabled={loading}
              >
                {ch.enabled ? 'ON' : 'OFF'}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => handleTest(ch.id)}
                disabled={testingId === ch.id || loading}
              >
                {testingId === ch.id ? '送信中...' : 'テスト送信'}
              </button>
              {testResult?.id === ch.id && (
                <span className={testResult.success ? 'text-green-600' : 'text-red-500'}>
                  {testResult.success ? '送信成功' : '送信失敗'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
