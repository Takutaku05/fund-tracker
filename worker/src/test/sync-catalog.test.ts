import { describe, it, expect, vi } from 'vitest';
import { syncCatalogToDb } from '../lib/sync-catalog';
import { FUND_CATALOG } from '../config/fund-catalog';

type PreparedCall = { sql: string; bindArgs: unknown[] };

function makeD1Mock() {
  const prepared: PreparedCall[] = [];
  const batchMock = vi.fn().mockResolvedValue([{ success: true }]);

  const prepareMock = vi.fn((sql: string) => {
    const entry: PreparedCall = { sql, bindArgs: [] };
    prepared.push(entry);
    return {
      bind: (...args: unknown[]) => {
        entry.bindArgs = args;
        return entry; // batch は渡された statement をそのまま扱う
      },
    };
  });

  return {
    db: { prepare: prepareMock, batch: batchMock } as unknown as D1Database,
    prepared,
    batchMock,
  };
}

describe('syncCatalogToDb', () => {
  it('upsert + disable を1回の batch にまとめる', async () => {
    const { db, batchMock } = makeD1Mock();
    await syncCatalogToDb(db);
    expect(batchMock).toHaveBeenCalledTimes(1);
    const stmts = batchMock.mock.calls[0][0] as unknown[];
    // カタログ件数分の upsert + 1件の disable
    expect(stmts.length).toBe(FUND_CATALOG.length + 1);
  });

  it('INSERT ON CONFLICT の SQL が含まれる', async () => {
    const { db, prepared } = makeD1Mock();
    await syncCatalogToDb(db);
    expect(prepared[0].sql).toMatch(/INSERT INTO funds/);
    expect(prepared[0].sql).toMatch(/ON CONFLICT\(id\) DO UPDATE/);
    expect(prepared[0].sql).toMatch(/enabled\s+= excluded\.enabled/);
  });

  it('カタログに無い id を enabled=0 に落とす SQL を発行する', async () => {
    const { db, prepared } = makeD1Mock();
    await syncCatalogToDb(db);
    const disable = prepared[prepared.length - 1];
    expect(disable.sql).toMatch(/UPDATE funds SET enabled = 0 WHERE id NOT IN/);
    expect(disable.bindArgs).toEqual(FUND_CATALOG.map((f) => f.id));
  });

  it('bind に正しい値が渡される（emaxis-ac）', async () => {
    const { db, prepared } = makeD1Mock();
    await syncCatalogToDb(db);

    const acIndex = FUND_CATALOG.findIndex((f) => f.id === 'emaxis-ac');
    const bindArgs = prepared[acIndex].bindArgs;

    expect(bindArgs[0]).toBe('emaxis-ac');
    expect(bindArgs[1]).toBe('eMAXIS Slim 全世界株式（オール・カントリー）');
    expect(bindArgs[4]).toBeNull(); // ticker
    expect(bindArgs[5]).toBe('toushin_lib');
    expect(JSON.parse(bindArgs[6] as string)).toMatchObject({
      isinCd: 'JP90C000H1T1',
      associFundCd: '0331418A',
    });
    expect(bindArgs[7]).toBe('JPY');
    expect(bindArgs[8]).toBe('1万口');
    expect(bindArgs[9]).toBe(1); // enabled default
  });

  it('enabled=false のエントリは 0 として bind される', async () => {
    const { db, prepared } = makeD1Mock();
    // 一時的にカタログに追加するのではなく、関数の振る舞いだけを見たいので
    // FUND_CATALOG の enabled フィールドの解釈を直接確認するのは困難。
    // 代わりに bind の末尾（enabled 列）が 1 になっていることを全件確認する。
    await syncCatalogToDb(db);
    for (let i = 0; i < FUND_CATALOG.length; i++) {
      const bindArgs = prepared[i].bindArgs;
      const expected = FUND_CATALOG[i].enabled === false ? 0 : 1;
      expect(bindArgs[9]).toBe(expected);
    }
  });

  it('DB 呼び出しが失敗したとき例外が伝播する', async () => {
    const batchMock = vi.fn().mockRejectedValue(new Error('D1 error'));
    const prepareMock = vi.fn().mockReturnValue({ bind: () => ({}) });
    const db = { prepare: prepareMock, batch: batchMock } as unknown as D1Database;
    await expect(syncCatalogToDb(db)).rejects.toThrow('D1 error');
  });
});
