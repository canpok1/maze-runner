import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as rankingsApi from '../api-client/rankings';
import { initRankingDisplay } from './ranking-display';

describe('initRankingDisplay', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="ranking-section">
        <h2>ランキング</h2>
        <div class="ranking-tabs">
          <button class="ranking-tab active" data-difficulty="easy">初級</button>
          <button class="ranking-tab" data-difficulty="normal">中級</button>
          <button class="ranking-tab" data-difficulty="hard">上級</button>
        </div>
        <div id="ranking-loading" class="hidden">読み込み中...</div>
        <div id="ranking-empty" class="hidden">ランキングデータがありません</div>
        <div id="ranking-error" class="hidden ranking__error">データの取得に失敗しました</div>
        <ol id="ranking-list"></ol>
      </section>
    `;

    vi.restoreAllMocks();
  });

  it('初期表示時に初級のランキングを取得する', async () => {
    const fetchRankingsMock = vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([
      { playerName: 'Player1', clearTime: 10000, createdAt: '2025-12-28T00:00:00Z' },
      { playerName: 'Player2', clearTime: 20000, createdAt: '2025-12-28T00:00:00Z' },
    ]);

    await initRankingDisplay();

    expect(fetchRankingsMock).toHaveBeenCalledWith('easy', 10);
  });

  it('ランキングデータを正しく表示する', async () => {
    vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([
      { playerName: 'Player1', clearTime: 10000, createdAt: '2025-12-28T00:00:00Z' },
      { playerName: 'Player2', clearTime: 20000, createdAt: '2025-12-28T00:00:00Z' },
      { playerName: 'Player3', clearTime: 30000, createdAt: '2025-12-28T00:00:00Z' },
    ]);

    await initRankingDisplay();

    const rankingList = document.getElementById('ranking-list');
    const items = rankingList?.querySelectorAll('li.ranking-item');

    expect(items?.length).toBe(3);
    expect(items?.[0].querySelector('.ranking-name')?.textContent).toBe('Player1');
    expect(items?.[0].querySelector('.ranking-time')?.textContent).toBe('10.00秒');
    expect(items?.[1].querySelector('.ranking-name')?.textContent).toBe('Player2');
    expect(items?.[1].querySelector('.ranking-time')?.textContent).toBe('20.00秒');
    expect(items?.[2].querySelector('.ranking-name')?.textContent).toBe('Player3');
    expect(items?.[2].querySelector('.ranking-time')?.textContent).toBe('30.00秒');
  });

  it('タイムをミリ秒から秒に変換して表示する', async () => {
    vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([
      { playerName: 'Player1', clearTime: 12345, createdAt: '2025-12-28T00:00:00Z' },
    ]);

    await initRankingDisplay();

    const rankingList = document.getElementById('ranking-list');
    const items = rankingList?.querySelectorAll('li.ranking-item');

    expect(items?.[0].querySelector('.ranking-time')?.textContent).toBe('12.35秒');
  });

  it('ランキングデータが空の場合、空状態を表示する', async () => {
    vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([]);

    await initRankingDisplay();

    const rankingList = document.getElementById('ranking-list');
    const emptyMessage = document.getElementById('ranking-empty');

    expect(rankingList?.children.length).toBe(0);
    expect(emptyMessage?.classList.contains('hidden')).toBe(false);
  });

  it('データ取得中はローディング表示をする', async () => {
    let resolvePromise!: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(rankingsApi, 'fetchRankings').mockReturnValue(promise as Promise<never>);

    const initPromise = initRankingDisplay();

    // データ取得中はローディングが表示される
    const loadingMessage = document.getElementById('ranking-loading');
    expect(loadingMessage?.classList.contains('hidden')).toBe(false);

    // データ取得完了後はローディングが非表示になる
    resolvePromise([]);
    await initPromise;

    expect(loadingMessage?.classList.contains('hidden')).toBe(true);
  });

  it('タブクリック時に対応する難易度のランキングを取得する', async () => {
    const fetchRankingsMock = vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([]);

    await initRankingDisplay();

    const normalTab = document.querySelector('[data-difficulty="normal"]') as HTMLButtonElement;
    normalTab.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchRankingsMock).toHaveBeenCalledWith('normal', 10);
  });

  it('タブクリック時にactive状態が切り替わる', async () => {
    vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([]);

    await initRankingDisplay();

    const easyTab = document.querySelector('[data-difficulty="easy"]') as HTMLButtonElement;
    const normalTab = document.querySelector('[data-difficulty="normal"]') as HTMLButtonElement;
    const hardTab = document.querySelector('[data-difficulty="hard"]') as HTMLButtonElement;

    // 初期状態：初級がアクティブ
    expect(easyTab.classList.contains('active')).toBe(true);
    expect(normalTab.classList.contains('active')).toBe(false);
    expect(hardTab.classList.contains('active')).toBe(false);

    // 中級タブをクリック
    normalTab.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(easyTab.classList.contains('active')).toBe(false);
    expect(normalTab.classList.contains('active')).toBe(true);
    expect(hardTab.classList.contains('active')).toBe(false);

    // 上級タブをクリック
    hardTab.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(easyTab.classList.contains('active')).toBe(false);
    expect(normalTab.classList.contains('active')).toBe(false);
    expect(hardTab.classList.contains('active')).toBe(true);
  });

  it('APIエラー時にエラーメッセージを表示する', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(rankingsApi, 'fetchRankings').mockRejectedValue(new Error('API Error'));

    await initRankingDisplay();

    expect(consoleErrorSpy).toHaveBeenCalled();

    // エラー時はエラーメッセージを表示
    const errorMessage = document.getElementById('ranking-error');
    const emptyMessage = document.getElementById('ranking-empty');
    expect(errorMessage?.classList.contains('hidden')).toBe(false);
    expect(errorMessage?.textContent).toBe('データの取得に失敗しました');
    expect(emptyMessage?.classList.contains('hidden')).toBe(true);
  });

  it('オフライン時に専用のエラーメッセージを表示する', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(rankingsApi, 'fetchRankings').mockRejectedValue(new Error('Network Error'));

    // navigator.onLineをモック
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    await initRankingDisplay();

    expect(consoleErrorSpy).toHaveBeenCalled();

    // オフライン時は専用のメッセージを表示
    const errorMessage = document.getElementById('ranking-error');
    expect(errorMessage?.classList.contains('hidden')).toBe(false);
    expect(errorMessage?.textContent).toBe('オフラインです');

    // navigator.onLineを元に戻す
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('データ取得成功時にエラーメッセージを非表示にする', async () => {
    vi.spyOn(rankingsApi, 'fetchRankings').mockResolvedValue([
      { playerName: 'Player1', clearTime: 10000, createdAt: '2025-12-28T00:00:00Z' },
    ]);

    await initRankingDisplay();

    const errorMessage = document.getElementById('ranking-error');
    expect(errorMessage?.classList.contains('hidden')).toBe(true);
  });

  it('必須DOM要素が存在しない場合、エラーをthrowする', async () => {
    document.body.innerHTML = '<div></div>';

    await expect(initRankingDisplay()).rejects.toThrow('Required ranking elements not found');
  });
});
