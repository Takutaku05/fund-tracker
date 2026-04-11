import React from 'react';
import { useNavData } from './hooks/useNavData';
import { useHistoryData } from './hooks/useHistoryData';
import { ValueCard } from './components/ValueCard';
import { NavChart } from './components/NavChart';
import { PeriodTabs } from './components/PeriodTabs';
import { LoadingState, ErrorState } from './components/States';
import { PERIOD_OPTIONS } from './types';
import {
  formatCurrency,
  formatSignedCurrency,
  formatPercent,
  formatDate,
  formatNetAsset
} from './lib/format';

import './styles/app.css';

export const App: React.FC = () => {
  const {
    latestNav,
    alltimePeak,
    loading: navLoading,
    error: navError,
    refresh: refreshNav
  } = useNavData();

  const {
    history,
    drawdown,
    period,
    setPeriod,
    loading: historyLoading,
    error: historyError
  } = useHistoryData('month', latestNav?.nav);

  const isLoading = navLoading;
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
        <h1>Fund Tracker</h1>
        <p className="subtitle">eMAXIS Slim 全世界株式（オール・カントリー）</p>
      </header>

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

          <div className="grid grid-cols-2" style={{ marginTop: '1rem', marginBottom: '1rem', gap: '1rem' }}>
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
          </div>

          <NavChart data={history} drawdown={drawdown} loading={historyLoading} />
        </section>
      )}

      <footer style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2rem' }}>
        <p>※ 基準価額は1万口あたりの価格です。</p>
        <p>※ データは毎日更新されます。</p>
      </footer>
    </div>
  );
};

export default App;
