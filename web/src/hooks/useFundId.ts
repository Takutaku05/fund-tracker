import { useEffect, useState } from 'react';

const DEFAULT_FUND_ID = (import.meta.env.VITE_DEFAULT_FUND_ID as string | undefined) || 'emaxis-ac';

function readFromLocation(): string {
  if (typeof window === 'undefined') return DEFAULT_FUND_ID;
  const param = new URLSearchParams(window.location.search).get('fund');
  return param && param.trim() ? param : DEFAULT_FUND_ID;
}

/**
 * URL のクエリ ?fund= から fundId を読む。無ければ VITE_DEFAULT_FUND_ID にフォールバック。
 * popstate で戻る/進む操作にも追従する。
 */
export function useFundId(): string {
  const [fundId, setFundId] = useState<string>(readFromLocation);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setFundId(readFromLocation());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  return fundId;
}
