import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as rankingsApi from '../api-client/rankings';
import { showScoreModal } from './score-modal';

describe('showScoreModal', () => {
  beforeEach(() => {
    // DOM環境をリセット
    document.body.innerHTML = `
      <div id="score-modal" class="modal hidden">
        <div class="modal-content">
          <h2>クリアおめでとう！</h2>
          <p id="score-display"></p>
          <p id="rank-message" class="rank-message hidden"></p>
          <p id="not-ranked-message" class="not-ranked hidden">
            トップ10にランクインできませんでした
          </p>
          <div id="registration-form">
            <div class="name-input-container">
              <label for="player-name">プレイヤー名</label>
              <input type="text" id="player-name" maxlength="20" placeholder="名前を入力">
              <span id="name-error" class="error-text"></span>
              <span id="submit-error" class="error-text hidden"></span>
            </div>
            <div class="modal-buttons">
              <button id="submit-score-btn" class="btn submit-btn">登録</button>
              <button id="skip-score-btn" class="btn skip-btn">スキップ</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // APIモックをリセット
    vi.restoreAllMocks();
  });

  it('モーダルが正しく表示される', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });

    await showScoreModal(123.45, 'easy', onComplete);

    const modal = document.getElementById('score-modal');
    const scoreDisplay = document.getElementById('score-display');

    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(scoreDisplay?.textContent).toContain('123.45');
  });

  it('プレイヤー名が空の場合、バリデーションエラーを表示する', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });

    await showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    const errorText = document.getElementById('name-error');

    playerNameInput.value = '';
    submitBtn.click();

    // エラーが表示される
    expect(errorText?.textContent).toBeTruthy();
    // onCompleteは呼ばれない
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('プレイヤー名が1文字の場合、登録できる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'A',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    await showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'A';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).toHaveBeenCalledWith('A', 100000, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('プレイヤー名が20文字の場合、登録できる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: '12345678901234567890',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    await showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = '12345678901234567890';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).toHaveBeenCalledWith('12345678901234567890', 100000, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('プレイヤー名が21文字以上の場合、バリデーションエラーを表示する', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });

    await showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    const errorText = document.getElementById('name-error');

    playerNameInput.value = '123456789012345678901'; // 21文字
    submitBtn.click();

    // エラーが表示される
    expect(errorText?.textContent).toBeTruthy();
    // onCompleteは呼ばれない
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('登録ボタン押下時にAPIが呼ばれる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 50000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    await showScoreModal(50, 'hard', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).toHaveBeenCalledWith('TestPlayer', 50000, 'hard');
    expect(onComplete).toHaveBeenCalled();
  });

  it('スキップボタン押下時にAPIが呼ばれない', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore');

    await showScoreModal(50, 'hard', onComplete);

    const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

    skipBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it('両ボタン押下後にonCompleteが呼ばれる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 50000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    // 登録ボタンのテスト
    await showScoreModal(50, 'hard', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onComplete).toHaveBeenCalledTimes(1);

    // リセット
    onComplete.mockClear();
    document.body.innerHTML = `
      <div id="score-modal" class="modal hidden">
        <div class="modal-content">
          <h2>クリアおめでとう！</h2>
          <p id="score-display"></p>
          <p id="rank-message" class="rank-message hidden"></p>
          <p id="not-ranked-message" class="not-ranked hidden">
            トップ10にランクインできませんでした
          </p>
          <div id="registration-form">
            <div class="name-input-container">
              <label for="player-name">プレイヤー名</label>
              <input type="text" id="player-name" maxlength="20" placeholder="名前を入力">
              <span id="name-error" class="error-text"></span>
              <span id="submit-error" class="error-text hidden"></span>
            </div>
            <div class="modal-buttons">
              <button id="submit-score-btn" class="btn submit-btn">登録</button>
              <button id="skip-score-btn" class="btn skip-btn">スキップ</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // スキップボタンのテスト
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    await showScoreModal(50, 'hard', onComplete);

    const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;
    skipBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('APIエラー時にエラーメッセージを表示してモーダルを閉じない', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi
      .spyOn(rankingsApi, 'submitScore')
      .mockRejectedValue(new Error('API Error'));

    await showScoreModal(50, 'hard', onComplete);

    const modal = document.getElementById('score-modal');
    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    const submitError = document.getElementById('submit-error');

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).toHaveBeenCalled();
    // エラーメッセージが表示される
    expect(submitError?.textContent).toBe('スコアの登録に失敗しました');
    expect(submitError?.classList.contains('hidden')).toBe(false);
    // モーダルは閉じない
    expect(modal?.classList.contains('hidden')).toBe(false);
    // onCompleteは呼ばれない
    expect(onComplete).not.toHaveBeenCalled();
    // ボタンが再度有効になる
    expect(submitBtn.disabled).toBe(false);
  });

  it('必須DOM要素が存在しない場合、エラーをthrowする', async () => {
    document.body.innerHTML = '<div></div>';
    await expect(async () => {
      await showScoreModal(100, 'normal', () => {});
    }).rejects.toThrow('Required modal elements not found');
  });

  it('プレイヤー名の前後の空白は自動的に削除される', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    await showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    // 前後に空白を含む名前を入力
    playerNameInput.value = '  TestPlayer  ';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    // trim されて送信されることを確認
    expect(submitScoreMock).toHaveBeenCalledWith('TestPlayer', 100000, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('スコアを秒からミリ秒に正しく変換して送信する', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 123456,
      createdAt: '2025-12-28T00:00:00Z',
    });

    // 123.456秒を渡す
    await showScoreModal(123.456, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 123456ミリ秒に変換されて送信されることを確認
    expect(submitScoreMock).toHaveBeenCalledWith('TestPlayer', 123456, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('登録後にモーダルが非表示になる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    await showScoreModal(100, 'normal', onComplete);

    const modal = document.getElementById('score-modal');
    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    // hiddenクラスが追加されることを確認
    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('スキップ後にモーダルが非表示になる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });

    await showScoreModal(100, 'normal', onComplete);

    const modal = document.getElementById('score-modal');
    const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

    skipBtn.click();

    // 非同期処理の完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 0));

    // hiddenクラスが追加されることを確認
    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('送信中はボタンテキストが「送信中...」に変更される', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    // 非同期処理を遅延させる
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              id: 1,
              playerName: 'TestPlayer',
              clearTime: 100000,
              createdAt: '2025-12-28T00:00:00Z',
            });
          }, 200);
        })
    );

    await showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // ボタンテキストが「送信中...」に変更されている
    expect(submitBtn.textContent).toBe('送信中...');
    // ボタンが無効化されている
    expect(submitBtn.disabled).toBe(true);

    // 仮想タイマーを進めて完了まで待つ
    await vi.advanceTimersByTimeAsync(200);

    expect(submitScoreMock).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('オフライン時にエラーメッセージを表示してモーダルを閉じない', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const originalOnLine = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

    // オフライン状態をシミュレート
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => false,
    });

    await showScoreModal(100, 'normal', onComplete);

    const modal = document.getElementById('score-modal');
    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    const submitError = document.getElementById('submit-error');

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // エラーメッセージが表示される
    expect(submitError?.textContent).toBe('オフラインです。後で再試行してください');
    expect(submitError?.classList.contains('hidden')).toBe(false);
    // モーダルは閉じない
    expect(modal?.classList.contains('hidden')).toBe(false);
    // onCompleteは呼ばれない
    expect(onComplete).not.toHaveBeenCalled();
    // ボタンが再度有効になる
    expect(submitBtn.disabled).toBe(false);

    // オンライン状態を復元
    if (originalOnLine) {
      Object.defineProperty(Navigator.prototype, 'onLine', originalOnLine);
    }
  });

  it('エラー後に再試行できる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
      rank: 1,
    });
    const submitScoreMock = vi
      .spyOn(rankingsApi, 'submitScore')
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce({
        id: 1,
        playerName: 'TestPlayer',
        clearTime: 100000,
        createdAt: '2025-12-28T00:00:00Z',
      });

    await showScoreModal(100, 'normal', onComplete);

    const modal = document.getElementById('score-modal');
    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
    const submitError = document.getElementById('submit-error');

    playerNameInput.value = 'TestPlayer';

    // 1回目：エラー
    submitBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).toHaveBeenCalledTimes(1);
    expect(submitError?.textContent).toBe('スコアの登録に失敗しました');
    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
    expect(submitBtn.disabled).toBe(false);

    // 2回目：成功
    submitBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(submitScoreMock).toHaveBeenCalledTimes(2);
    expect(modal?.classList.contains('hidden')).toBe(true);
    expect(onComplete).toHaveBeenCalled();
  });

  describe('ランクイン判定機能', () => {
    it('ランクイン時（rank <= 10）に登録フォームとランクインメッセージが表示される', async () => {
      const onComplete = vi.fn();
      const fetchRankMock = vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
        rank: 3,
      });

      showScoreModal(123.45, 'easy', onComplete);

      // 非同期処理の完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchRankMock).toHaveBeenCalledWith('easy', 123450);

      const rankMessage = document.getElementById('rank-message');
      const notRankedMessage = document.getElementById('not-ranked-message');
      const registrationForm = document.getElementById('registration-form');
      const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

      // ランクインメッセージが表示される
      expect(rankMessage?.classList.contains('hidden')).toBe(false);
      expect(rankMessage?.textContent).toBe('3位にランクイン！');

      // ランク外メッセージは非表示
      expect(notRankedMessage?.classList.contains('hidden')).toBe(true);

      // 登録フォームが表示される
      expect(registrationForm?.classList.contains('hidden')).toBe(false);

      // スキップボタンのテキストは「スキップ」のまま
      expect(skipBtn.textContent).toBe('スキップ');
    });

    it('ランク外時（rank > 10）に登録フォームが非表示になり、ランク外メッセージが表示される', async () => {
      const onComplete = vi.fn();
      const fetchRankMock = vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
        rank: 11,
      });

      showScoreModal(999.99, 'normal', onComplete);

      // 非同期処理の完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchRankMock).toHaveBeenCalledWith('normal', 999990);

      const rankMessage = document.getElementById('rank-message');
      const notRankedMessage = document.getElementById('not-ranked-message');
      const registrationForm = document.getElementById('registration-form');

      // ランクインメッセージは非表示
      expect(rankMessage?.classList.contains('hidden')).toBe(true);

      // ランク外メッセージが表示される
      expect(notRankedMessage?.classList.contains('hidden')).toBe(false);

      // 登録フォームが非表示
      expect(registrationForm?.classList.contains('hidden')).toBe(true);
    });

    it('ランク外時にスキップボタンのテキストが「閉じる」になる', async () => {
      const onComplete = vi.fn();
      vi.spyOn(rankingsApi, 'fetchRank').mockResolvedValue({
        rank: 11,
      });

      showScoreModal(999.99, 'hard', onComplete);

      // 非同期処理の完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 0));

      const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

      // スキップボタンのテキストが「閉じる」になる
      expect(skipBtn.textContent).toBe('閉じる');
    });

    it('fetchRank APIエラー時は従来どおり登録フォームを表示（フォールバック）', async () => {
      const onComplete = vi.fn();
      const fetchRankMock = vi
        .spyOn(rankingsApi, 'fetchRank')
        .mockRejectedValue(new Error('API Error'));

      showScoreModal(123.45, 'easy', onComplete);

      // 非同期処理の完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(fetchRankMock).toHaveBeenCalledWith('easy', 123450);

      const rankMessage = document.getElementById('rank-message');
      const notRankedMessage = document.getElementById('not-ranked-message');
      const registrationForm = document.getElementById('registration-form');
      const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

      // ランクインメッセージは非表示
      expect(rankMessage?.classList.contains('hidden')).toBe(true);

      // ランク外メッセージは非表示
      expect(notRankedMessage?.classList.contains('hidden')).toBe(true);

      // 登録フォームが表示される（フォールバック）
      expect(registrationForm?.classList.contains('hidden')).toBe(false);

      // スキップボタンのテキストは「スキップ」のまま
      expect(skipBtn.textContent).toBe('スキップ');
    });
  });
});
