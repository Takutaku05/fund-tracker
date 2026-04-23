import { useCallback, useEffect, useState } from 'react';

const DEFAULT_FUND_ID = (import.meta.env.VITE_DEFAULT_FUND_ID as string | undefined) || 'emaxis-ac';

function readFromLocation(): string {
  if (typeof window === 'undefined') return DEFAULT_FUND_ID;
  const param = new URLSearchParams(window.location.search).get('fund');
  return param && param.trim() ? param : DEFAULT_FUND_ID;
}

/**
 * URL のクエリ ?fund= から fundId を読み書きする。
 * 読み: 初期値 + popstate で戻る/進む操作に追従。
 * 書き: pushState で URL を更新し、state も同期する（pushState は popstate を発火しないため）。
 */
export function useFundId(): [string, (next: string) => void] {
  const [fundId, setFundId] = useState<string>(readFromLocation);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setFundId(readFromLocation());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const changeFund = useCallback((next: string) => {
    if (!next || typeof window === 'undefined') return;
    setFundId(prev => {
      if (prev === next) return prev;
      const url = new URL(window.location.href);
      url.searchParams.set('fund', next);
      window.history.pushState(null, '', url.toString());
      return next;
    });
  }, []);

  return [fundId, changeFund];
}
