import type { Difficulty } from '@maze-runner/lib';
import { submitScore } from '../api-client/rankings';

/**
 * スコア登録モーダルを表示する
 * @param score クリアタイム（秒）
 * @param difficulty 難易度
 * @param onComplete モーダル完了時のコールバック
 */
export function showScoreModal(
  score: number,
  difficulty: Difficulty,
  onComplete: () => void
): void {
  const modal = document.getElementById('score-modal');
  const scoreDisplay = document.getElementById('score-display');
  const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
  const nameError = document.getElementById('name-error');
  const submitError = document.getElementById('submit-error');
  const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
  const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;

  if (
    !modal ||
    !scoreDisplay ||
    !playerNameInput ||
    !nameError ||
    !submitError ||
    !submitBtn ||
    !skipBtn
  ) {
    throw new Error('Required modal elements not found');
  }

  // スコアを表示
  scoreDisplay.textContent = `クリアタイム: ${score.toFixed(2)}秒`;

  // モーダルを表示
  modal.classList.remove('hidden');

  // 入力とボタン状態をリセット
  playerNameInput.value = '';
  nameError.textContent = '';
  submitError.textContent = '';
  submitError.classList.add('hidden');
  submitBtn.disabled = false;
  skipBtn.disabled = false;

  // 登録ボタンのイベントハンドラ
  const handleSubmit = async () => {
    const playerName = playerNameInput.value.trim();

    // バリデーション
    if (playerName.length === 0) {
      nameError.textContent = 'プレイヤー名を入力してください';
      return;
    }

    if (playerName.length > 20) {
      nameError.textContent = 'プレイヤー名は20文字以内で入力してください';
      return;
    }

    // ボタンを無効化（二重クリック防止）
    submitBtn.disabled = true;
    skipBtn.disabled = true;

    // ボタンテキストを「送信中...」に変更
    const originalButtonText = submitBtn.textContent || '登録';
    submitBtn.textContent = '送信中...';

    // エラーをクリア
    nameError.textContent = '';
    submitError.textContent = '';
    submitError.classList.add('hidden');

    // オフライン検出
    if (!navigator.onLine) {
      submitError.textContent = 'オフラインです。後で再試行してください';
      submitError.classList.remove('hidden');
      submitBtn.disabled = false;
      skipBtn.disabled = false;
      submitBtn.textContent = originalButtonText;
      return;
    }

    try {
      // スコアを秒からミリ秒に変換
      const clearTimeMs = Math.round(score * 1000);
      await submitScore(playerName, clearTimeMs, difficulty);
      // 成功時のみモーダルを閉じる
      closeModal();
    } catch (error) {
      // エラーが発生した場合、エラーメッセージを表示してモーダルを閉じない
      console.error('Failed to submit score:', error);
      submitError.textContent = 'スコアの登録に失敗しました';
      submitError.classList.remove('hidden');
      submitBtn.disabled = false;
      skipBtn.disabled = false;
      submitBtn.textContent = originalButtonText;
    }
  };

  // スキップボタンのイベントハンドラ
  const handleSkip = () => {
    // ボタンを無効化（二重クリック防止）
    submitBtn.disabled = true;
    skipBtn.disabled = true;
    closeModal();
  };

  // モーダルを閉じる共通処理
  const closeModal = () => {
    modal.classList.add('hidden');

    // イベントリスナーを削除
    submitBtn.removeEventListener('click', handleSubmit);
    skipBtn.removeEventListener('click', handleSkip);

    // コールバックを呼ぶ
    onComplete();
  };

  // イベントリスナーを追加
  submitBtn.addEventListener('click', handleSubmit);
  skipBtn.addEventListener('click', handleSkip);
}
