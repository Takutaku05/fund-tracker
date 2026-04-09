import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>データを読み込み中...</p>
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="error">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <div>
        <h3 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>エラーが発生しました</h3>
        <p style={{ fontSize: '0.875rem' }}>{message}</p>
      </div>
      <button className="btn" onClick={onRetry}>
        再試行する
      </button>
    </div>
  );
};
