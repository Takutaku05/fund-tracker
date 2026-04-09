import React from 'react';
import { useNavData } from '../hooks/useNavData';
import { useHistoryData } from '../hooks/useHistoryData';
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
    valuation, 
    loading: navLoading, 
    error: navError, 
    refresh: refreshNav 
  } = useNavData();
  
  const { 
    history, 
    period, 
    setPeriod, 
    loading: historyLoading, 
    error: historyError 
  } = useHistoryData('month');

  const isLoading = navLoading;
  const error = navError || historyError;

  const handleRetry = () => {
    refreshNav();
    // History will retry automatically when period changes, but we might want to force it
    // For now, refreshing nav is the primary retry action
  };

  if (isLoading) return <LoadingState />;
  
  if (error && !latestNav && !valuation) {
    return <ErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="app-container">
      <header>
        <h1>Fund Tracker</h1>
        <p className="subtitle">eMAXIS Slim 全世界株式（オール・カントリー）</p>
      </header>

      {valuation && (
        <section className="card-section">
          <div className="card-section-header">現在の評価額</div>
          <ValueCard
            important
            label={`${formatDate(valuation.date)} 時点`}
            value={formatCurrency(valuation.currentValue)}
            subValue={`${formatSignedCurrency(valuation.profitLoss)} (${formatPercent(valuation.profitLossPercent)})`}
            isPositive={valuation.profitLoss >= 0}
          />
          
          <div className="grid grid-cols-2" style={{ marginTop: '1.5rem', gap: '1.5rem' }}>
            <ValueCard
              label="保有口数"
              value={`${valuation.totalUnits.toLocaleString('ja-JP')}口`}
            />
            <ValueCard
              label="投資総額"
              value={formatCurrency(valuation.totalInvested)}
            />
          </div>
        </section>
      )}

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

          <PeriodTabs options={PERIOD_OPTIONS} value={period} onChange={setPeriod} />
          
          <NavChart data={history} loading={historyLoading} />
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
