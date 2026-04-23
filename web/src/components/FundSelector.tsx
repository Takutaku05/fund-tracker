import React, { useEffect, useState } from 'react';
import { fetchFunds } from '../lib/api';
import type { FundMeta } from '../types';

interface Props {
  fundId: string;
  onChange: (id: string) => void;
}

export const FundSelector: React.FC<Props> = ({ fundId, onChange }) => {
  const [funds, setFunds] = useState<FundMeta[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchFunds()
      .then(list => {
        if (!cancelled) setFunds(list);
      })
      .catch(() => {
        if (!cancelled) setFunds([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (funds.length <= 1) return null;

  return (
    <select
      className="fund-selector"
      value={fundId}
      onChange={(e) => onChange(e.target.value)}
      aria-label="銘柄を選択"
    >
      {funds.map(f => (
        <option key={f.id} value={f.id}>{f.nameJa}</option>
      ))}
    </select>
  );
};
