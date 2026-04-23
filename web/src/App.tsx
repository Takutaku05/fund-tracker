import React, { useState } from 'react';
import { useNavData } from './hooks/useNavData';
import { useHistoryData } from './hooks/useHistoryData';
import { useAuth } from './hooks/useAuth';
import { useFundId } from './hooks/useFundId';
import { ValueCard } from './components/ValueCard';
import { NavChart } from './components/NavChart';
import { PeriodTabs } from './components/PeriodTabs';
import { FundSelector } from './components/FundSelector';
import { LoadingState, ErrorState } from './components/States';
import { SettingsPage } from './components/SettingsPage';
import { PERIOD_OPTIONS } from './types';
import {
  formatCurrency,
  formatSignedCurrency,
  formatPercent,
  formatDate,
  formatNetAsset
} from './lib/format';

import './styles/app.css';

type Page = 'dashboard' | 'settings';

export const App: React.FC = () => {
  const [page, setPage] = useState<Page>('dashboard');
  const { user, loading: authLoading, login, logout } = useAuth();
  const [fundId, setFundId] = useFundId();

  const {
    latestNav,
    alltimePeak,
    loading: navLoading,
    error: navError,
    refresh: refreshNav
  } = useNavData(fundId);

  const {
    history,
    drawdown,
    period,
    setPeriod,
    loading: historyLoading,
    error: historyError
  } = useHistoryData('month', latestNav?.nav, fundId);

  const isLoading = navLoading || authLoading;
  const error = navError || historyError;

  const handleRetry = () => {
    refreshNav();
  };

  if (isLoading) return <LoadingState />;

  if (error && !latestNav) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="app-container">
      <header>
        <div className="header-top">
          <div>
            <h1>Fund Tracker</h1>
            <div className="fund-heading-row">
              <FundSelector fundId={fundId} onChange={setFundId} />
              <p className="subtitle">{latestNav?.fund.nameJa ?? ' '}</p>
            </div>
          </div>
          <div className="auth-area">
            {user ? (
              <>
                <span className="auth-email">{user.email || 'ログイン中'}</span>
                <button className="btn btn-sm btn-secondary" onClick={logout}>ログアウト</button>
              </>
            ) : (
              <button className="btn btn-sm" onClick={login}>Googleでログイン</button>
            )}
          </div>
        </div>
        <nav className="page-nav">
          <button
            className={`page-nav-btn ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            ダッシュボード
          </button>
          <button
            className={`page-nav-btn ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage('settings')}
          >
            設定
          </button>
        </nav>
      </header>

      {page === 'settings' ? (
        user ? (
          <SettingsPage />
        ) : (
          <div className="login-prompt">
            <p>設定を利用するにはログインが必要です。</p>
            <button className="btn" onClick={login}>Googleでログイン</button>
          </div>
        )
      ) : (
        <>
          {latestNav && (
            <section className="card-section">
              <div className="card-section-header">基準価額の推移</div>

              <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem' }}>
                <ValueCard
                  label="基準価額"
                  value={formatCurrency(latestNav.nav)}
                  subValue={latestNav.change !== null ?
                    `前日比 ${formatSignedCurrency(latestNav.change)}` : undefined}
                  isPositive={latestNav.change !== null ? latestNav.change >= 0 : null}
                />
                {latestNav.netAsset && (
                  <ValueCard
                    label="純資産総額"
                    value={formatNetAsset(latestNav.netAsset)}
                  />
                )}
              </div>

              {alltimePeak && (
                <div className="grid grid-cols-2" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
                  <ValueCard
                    label="全期間最高値"
                    value={formatCurrency(alltimePeak.peak)}
                    subValue={formatDate(alltimePeak.peakDate)}
                  />
                  <ValueCard
                    label="最高値からの下落率"
                    value={formatPercent(alltimePeak.drawdownPercent)}
                    subValue={alltimePeak.drawdown !== 0 ? formatSignedCurrency(alltimePeak.drawdown) : undefined}
                    isPositive={alltimePeak.drawdownPercent >= 0}
                  />
                </div>
              )}

              <PeriodTabs options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />

              <div className="grid grid-cols-3" style={{ marginTop: '1rem', marginBottom: '1rem', gap: '1rem' }}>
                <ValueCard
                  label="期間高値"
                  value={drawdown ? formatCurrency(drawdown.peak) : '—'}
                  subValue={drawdown ? formatDate(drawdown.peakDate) : undefined}
                />
                <ValueCard
                  label="期間ピーク比下落率"
                  value={drawdown ? formatPercent(drawdown.drawdownPercent) : '—'}
                  subValue={drawdown && drawdown.drawdown !== 0 ? formatSignedCurrency(drawdown.drawdown) : undefined}
                  isPositive={drawdown ? drawdown.drawdownPercent >= 0 : null}
                />
                <ValueCard
                  label="期間ピーク上昇率"
                  value={drawdown ? formatPercent(drawdown.gainPercent) : '—'}
                  subValue={drawdown && drawdown.gain !== 0 ? formatSignedCurrency(drawdown.gain) : undefined}
                  isPositive={drawdown ? drawdown.gainPercent >= 0 : null}
                />
              </div>

              <NavChart data={history} drawdown={drawdown} loading={historyLoading} />
            </section>
          )}

          <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
            <p>※ 基準価額は1万口あたりの価格です。</p>
            <p>※ データは毎日更新されます。</p>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
