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
  const submitBtn = document.getElementById('submit-score-btn');
  const skipBtn = document.getElementById('skip-score-btn');

  if (!modal || !scoreDisplay || !playerNameInput || !nameError || !submitBtn || !skipBtn) {
    throw new Error('Required modal elements not found');
  }

  // スコアを表示
  scoreDisplay.textContent = `クリアタイム: ${score.toFixed(2)}秒`;

  // モーダルを表示
  modal.classList.remove('hidden');

  // 入力をリセット
  playerNameInput.value = '';
  nameError.textContent = '';

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

    // エラーをクリア
    nameError.textContent = '';

    try {
      // スコアを秒からミリ秒に変換
      const clearTimeMs = Math.round(score * 1000);
      await submitScore(playerName, clearTimeMs, difficulty);
    } catch (error) {
      // エラーが発生してもモーダルを閉じる
      console.error('Failed to submit score:', error);
    } finally {
      // モーダルを閉じる
      closeModal();
    }
  };

  // スキップボタンのイベントハンドラ
  const handleSkip = () => {
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
