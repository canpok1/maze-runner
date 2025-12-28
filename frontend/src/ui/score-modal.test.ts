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
          <div class="name-input-container">
            <label for="player-name">プレイヤー名</label>
            <input type="text" id="player-name" maxlength="20" placeholder="名前を入力">
            <span id="name-error" class="error-text"></span>
          </div>
          <div class="modal-buttons">
            <button id="submit-score-btn" class="btn submit-btn">登録</button>
            <button id="skip-score-btn" class="btn skip-btn">スキップ</button>
          </div>
        </div>
      </div>
    `;

    // APIモックをリセット
    vi.restoreAllMocks();
  });

  it('モーダルが正しく表示される', () => {
    const onComplete = vi.fn();

    showScoreModal(123.45, 'easy', onComplete);

    const modal = document.getElementById('score-modal');
    const scoreDisplay = document.getElementById('score-display');

    expect(modal?.classList.contains('hidden')).toBe(false);
    expect(scoreDisplay?.textContent).toContain('123.45');
  });

  it('プレイヤー名が空の場合、バリデーションエラーを表示する', async () => {
    const onComplete = vi.fn();

    showScoreModal(100, 'normal', onComplete);

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
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'A',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'A';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(submitScoreMock).toHaveBeenCalledWith('A', 100000, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('プレイヤー名が20文字の場合、登録できる', async () => {
    const onComplete = vi.fn();
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: '12345678901234567890',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = '12345678901234567890';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(submitScoreMock).toHaveBeenCalledWith('12345678901234567890', 100000, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('プレイヤー名が21文字以上の場合、バリデーションエラーを表示する', async () => {
    const onComplete = vi.fn();

    showScoreModal(100, 'normal', onComplete);

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
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 50000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    showScoreModal(50, 'hard', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(submitScoreMock).toHaveBeenCalledWith('TestPlayer', 50000, 'hard');
    expect(onComplete).toHaveBeenCalled();
  });

  it('スキップボタン押下時にAPIが呼ばれない', async () => {
    const onComplete = vi.fn();
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore');

    showScoreModal(50, 'hard', onComplete);

    const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

    skipBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(submitScoreMock).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it('両ボタン押下後にonCompleteが呼ばれる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 50000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    // 登録ボタンのテスト
    showScoreModal(50, 'hard', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onComplete).toHaveBeenCalledTimes(1);

    // リセット
    onComplete.mockClear();
    document.body.innerHTML = `
      <div id="score-modal" class="modal hidden">
        <div class="modal-content">
          <h2>クリアおめでとう！</h2>
          <p id="score-display"></p>
          <div class="name-input-container">
            <label for="player-name">プレイヤー名</label>
            <input type="text" id="player-name" maxlength="20" placeholder="名前を入力">
            <span id="name-error" class="error-text"></span>
          </div>
          <div class="modal-buttons">
            <button id="submit-score-btn" class="btn submit-btn">登録</button>
            <button id="skip-score-btn" class="btn skip-btn">スキップ</button>
          </div>
        </div>
      </div>
    `;

    // スキップボタンのテスト
    showScoreModal(50, 'hard', onComplete);

    const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;
    skipBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('APIエラー時もモーダルを閉じてonCompleteを呼ぶ', async () => {
    const onComplete = vi.fn();
    const submitScoreMock = vi
      .spyOn(rankingsApi, 'submitScore')
      .mockRejectedValue(new Error('API Error'));

    showScoreModal(50, 'hard', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(submitScoreMock).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
  });

  it('必須DOM要素が存在しない場合、エラーをthrowする', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => {
      showScoreModal(100, 'normal', () => {});
    }).toThrow('Required modal elements not found');
  });

  it('プレイヤー名の前後の空白は自動的に削除される', async () => {
    const onComplete = vi.fn();
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    showScoreModal(100, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    // 前後に空白を含む名前を入力
    playerNameInput.value = '  TestPlayer  ';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    // trim されて送信されることを確認
    expect(submitScoreMock).toHaveBeenCalledWith('TestPlayer', 100000, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('スコアを秒からミリ秒に正しく変換して送信する', async () => {
    const onComplete = vi.fn();
    const submitScoreMock = vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 123456,
      createdAt: '2025-12-28T00:00:00Z',
    });

    // 123.456秒を渡す
    showScoreModal(123.456, 'normal', onComplete);

    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 123456ミリ秒に変換されて送信されることを確認
    expect(submitScoreMock).toHaveBeenCalledWith('TestPlayer', 123456, 'normal');
    expect(onComplete).toHaveBeenCalled();
  });

  it('登録後にモーダルが非表示になる', async () => {
    const onComplete = vi.fn();
    vi.spyOn(rankingsApi, 'submitScore').mockResolvedValue({
      id: 1,
      playerName: 'TestPlayer',
      clearTime: 100000,
      createdAt: '2025-12-28T00:00:00Z',
    });

    showScoreModal(100, 'normal', onComplete);

    const modal = document.getElementById('score-modal');
    const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
    const playerNameInput = document.getElementById('player-name') as HTMLInputElement;

    playerNameInput.value = 'TestPlayer';
    submitBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    // hiddenクラスが追加されることを確認
    expect(modal?.classList.contains('hidden')).toBe(true);
  });

  it('スキップ後にモーダルが非表示になる', async () => {
    const onComplete = vi.fn();

    showScoreModal(100, 'normal', onComplete);

    const modal = document.getElementById('score-modal');
    const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

    skipBtn.click();

    // 少し待つ（非同期処理）
    await new Promise((resolve) => setTimeout(resolve, 100));

    // hiddenクラスが追加されることを確認
    expect(modal?.classList.contains('hidden')).toBe(true);
  });
});
