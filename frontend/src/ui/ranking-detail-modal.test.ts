import { beforeEach, describe, expect, it } from 'vitest';
import type { Ranking } from '../api-client/types';
import { showRankingDetailModal } from './ranking-detail-modal';

describe('showRankingDetailModal', () => {
  beforeEach(() => {
    // DOM環境をリセット
    document.body.innerHTML = `
      <div id="ranking-detail-modal" class="modal hidden">
        <div class="modal-content">
          <h2>ランキング詳細</h2>
          <div class="detail-item">
            <span class="detail-label">順位</span>
            <span id="detail-rank" class="detail-value"></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">プレイヤー名</span>
            <span id="detail-player-name" class="detail-value"></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">クリアタイム</span>
            <span id="detail-clear-time" class="detail-value"></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">登録日時</span>
            <span id="detail-created-at" class="detail-value"></span>
          </div>
          <button id="detail-close-btn" class="detail-close-btn">閉じる</button>
        </div>
      </div>
    `;
  });

  it('モーダルが正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const modal = document.getElementById('ranking-detail-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
  });

  it('1位が正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('1位');
  });

  it('2位が正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 2);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('2位');
  });

  it('3位が正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 3);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('3位');
  });

  it('4位以降が正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 10);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('10位');
  });

  it('プレイヤー名が正しく表示される（省略なし）', () => {
    const ranking: Ranking = {
      playerName: 'VeryLongPlayerName1234',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const playerNameDisplay = document.getElementById('detail-player-name');
    expect(playerNameDisplay?.textContent).toBe('VeryLongPlayerName1234');
  });

  it('クリアタイムが秒単位で正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123456, // 123.456秒
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const clearTimeDisplay = document.getElementById('detail-clear-time');
    expect(clearTimeDisplay?.textContent).toBe('123.46秒');
  });

  it('登録日時が日本語形式で正しく表示される', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00.000Z',
    };

    showRankingDetailModal(ranking, 1);

    const createdAtDisplay = document.getElementById('detail-created-at');
    const expectedDate = new Date('2025-12-28T10:30:00.000Z').toLocaleString('ja-JP');
    expect(createdAtDisplay?.textContent).toBe(expectedDate);
  });

  it('閉じるボタンでモーダルが閉じる', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const modal = document.getElementById('ranking-detail-modal');
    const closeBtn = document.getElementById('detail-close-btn') as HTMLButtonElement;

    closeBtn.click();

    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('背景クリックでモーダルが閉じる', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const modal = document.getElementById('ranking-detail-modal') as HTMLElement;

    // モーダル背景をクリック
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(clickEvent, 'target', {
      value: modal,
      writable: false,
    });
    modal.dispatchEvent(clickEvent);

    expect(modal.classList.contains('hidden')).toBe(true);
  });

  it('モーダルコンテンツクリックではモーダルが閉じない', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const modal = document.getElementById('ranking-detail-modal') as HTMLElement;
    const modalContent = modal.querySelector('.modal-content') as HTMLElement;

    // モーダルコンテンツをクリック
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(clickEvent, 'target', {
      value: modalContent,
      writable: false,
    });
    modal.dispatchEvent(clickEvent);

    expect(modal.classList.contains('hidden')).toBe(false);
  });

  it('ESCキーでモーダルが閉じる', () => {
    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    showRankingDetailModal(ranking, 1);

    const modal = document.getElementById('ranking-detail-modal');

    // ESCキーを押す
    const escEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escEvent);

    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('必須DOM要素が存在しない場合、エラーをthrowする', () => {
    document.body.innerHTML = '<div></div>';

    const ranking: Ranking = {
      playerName: 'TestPlayer',
      clearTime: 123450,
      createdAt: '2025-12-28T10:30:00Z',
    };

    expect(() => {
      showRankingDetailModal(ranking, 1);
    }).toThrow('Required modal elements not found');
  });
});
