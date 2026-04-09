import React from 'react';
import type { Period, PeriodOption } from '../types';

interface PeriodTabsProps {
  options: PeriodOption[];
  value: Period;
  onChange: (period: Period) => void;
}

export const PeriodTabs: React.FC<PeriodTabsProps> = ({ options, value, onChange }) => {
  return (
    <div className="tabs-container">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`tab-btn ${value === option.value ? 'active' : ''}`}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
