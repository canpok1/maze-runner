import { beforeEach, describe, expect, it } from 'vitest';
import type { Ranking } from '../api-client/types';
import { showRankingDetailModal } from './ranking-detail-modal';

describe('showRankingDetailModal', () => {
  const defaultRanking: Ranking = {
    playerName: 'TestPlayer',
    clearTime: 123450,
    createdAt: '2025-12-28T10:30:00Z',
  };

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
    showRankingDetailModal(defaultRanking, 1);

    const modal = document.getElementById('ranking-detail-modal');
    expect(modal?.classList.contains('hidden')).toBe(false);
  });

  it('1位が正しく表示される', () => {
    showRankingDetailModal(defaultRanking, 1);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('1位');
  });

  it('2位が正しく表示される', () => {
    showRankingDetailModal(defaultRanking, 2);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('2位');
  });

  it('3位が正しく表示される', () => {
    showRankingDetailModal(defaultRanking, 3);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('3位');
  });

  it('4位以降が正しく表示される', () => {
    showRankingDetailModal(defaultRanking, 10);

    const rankDisplay = document.getElementById('detail-rank');
    expect(rankDisplay?.textContent).toBe('10位');
  });

  it('プレイヤー名が正しく表示される（省略なし）', () => {
    const ranking: Ranking = {
      ...defaultRanking,
      playerName: 'VeryLongPlayerName1234',
    };

    showRankingDetailModal(ranking, 1);

    const playerNameDisplay = document.getElementById('detail-player-name');
    expect(playerNameDisplay?.textContent).toBe('VeryLongPlayerName1234');
  });

  it('クリアタイムが秒単位で正しく表示される', () => {
    const ranking: Ranking = {
      ...defaultRanking,
      clearTime: 123456, // 123.456秒
    };

    showRankingDetailModal(ranking, 1);

    const clearTimeDisplay = document.getElementById('detail-clear-time');
    expect(clearTimeDisplay?.textContent).toBe('123.46秒');
  });

  it('登録日時がJSTフォーマットで正しく表示される', () => {
    const ranking: Ranking = {
      ...defaultRanking,
      createdAt: '2025-12-28T10:30:00.000Z',
    };

    showRankingDetailModal(ranking, 1);

    const createdAtDisplay = document.getElementById('detail-created-at');
    expect(createdAtDisplay?.textContent).toBe('2025/12/28 19:30:00 JST');
  });

  it('閉じるボタンでモーダルが閉じる', () => {
    showRankingDetailModal(defaultRanking, 1);

    const modal = document.getElementById('ranking-detail-modal');
    const closeBtn = document.getElementById('detail-close-btn') as HTMLButtonElement;

    closeBtn.click();

    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('背景クリックでモーダルが閉じる', () => {
    showRankingDetailModal(defaultRanking, 1);

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
    showRankingDetailModal(defaultRanking, 1);

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
    showRankingDetailModal(defaultRanking, 1);

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

    expect(() => {
      showRankingDetailModal(defaultRanking, 1);
    }).toThrow('Required modal elements not found');
  });

  it('複数回モーダルを開いた場合、古いイベントリスナーが削除される', () => {
    // 1回目のモーダル表示
    showRankingDetailModal(defaultRanking, 1);
    const modal = document.getElementById('ranking-detail-modal') as HTMLElement;

    // 1回目のESCキーでモーダルが閉じることを確認
    const escEvent1 = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escEvent1);
    expect(modal.classList.contains('hidden')).toBe(true);

    // 2回目のモーダル表示（新しいAbortControllerが作成される）
    const ranking2: Ranking = {
      playerName: 'AnotherPlayer',
      clearTime: 234560,
      createdAt: '2025-12-29T12:00:00Z',
    };
    showRankingDetailModal(ranking2, 2);
    expect(modal.classList.contains('hidden')).toBe(false);

    // 1回目のESCキーイベントハンドラーが削除されていることを確認
    // 2回目のESCキーでモーダルが閉じることを確認（古いハンドラーは削除済み）
    const escEvent2 = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escEvent2);
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});
