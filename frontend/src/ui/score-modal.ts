import type { Difficulty } from '@maze-runner/lib';
import { fetchRank, submitScore } from '../api-client/rankings';

/**
 * スコア登録モーダルを表示する
 * @param score クリアタイム（秒）
 * @param difficulty 難易度
 * @param onComplete モーダル完了時のコールバック
 */
export async function showScoreModal(
  score: number,
  difficulty: Difficulty,
  onComplete: () => void
): Promise<void> {
  const modal = document.getElementById('score-modal');
  const scoreDisplay = document.getElementById('score-display');
  const playerNameInput = document.getElementById('player-name') as HTMLInputElement;
  const nameError = document.getElementById('name-error');
  const submitError = document.getElementById('submit-error');
  const submitBtn = document.getElementById('submit-score-btn') as HTMLButtonElement;
  const skipBtn = document.getElementById('skip-score-btn') as HTMLButtonElement;
  const rankMessage = document.getElementById('rank-message');
  const notRankedMessage = document.getElementById('not-ranked-message');
  const registrationForm = document.getElementById('registration-form');

  if (
    !modal ||
    !scoreDisplay ||
    !playerNameInput ||
    !nameError ||
    !submitError ||
    !submitBtn ||
    !skipBtn ||
    !rankMessage ||
    !notRankedMessage ||
    !registrationForm
  ) {
    throw new Error('Required modal elements not found');
  }

  // スコアを表示
  scoreDisplay.textContent = `クリアタイム: ${score.toFixed(2)}秒`;

  // 入力とボタン状態をリセット
  playerNameInput.value = '';
  nameError.textContent = '';
  submitError.textContent = '';
  submitError.classList.add('hidden');
  submitBtn.disabled = false;
  skipBtn.disabled = false;

  // ランクイン判定関連要素を初期化
  rankMessage.classList.add('hidden');
  rankMessage.textContent = '';
  notRankedMessage.classList.add('hidden');
  registrationForm.classList.add('hidden');
  skipBtn.textContent = 'スキップ';

  // モーダル表示前にランクイン判定を実行
  const clearTimeMs = Math.round(score * 1000);
  try {
    const result = await fetchRank(difficulty, clearTimeMs);
    const isTopTen = result.rank <= 10;
    if (isTopTen) {
      rankMessage.textContent = `${result.rank}位にランクイン！`;
      rankMessage.classList.remove('hidden');
      registrationForm.classList.remove('hidden');
    } else {
      notRankedMessage.classList.remove('hidden');
      registrationForm.classList.add('hidden');
      skipBtn.textContent = '閉じる';
    }
  } catch (error) {
    // エラー時は従来どおり登録フォームを表示（フォールバック）
    console.error('Failed to check rank eligibility:', error);
    registrationForm.classList.remove('hidden');
  }

  // ランクイン判定完了後にモーダルを表示
  modal.classList.remove('hidden');

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

    const originalButtonText = submitBtn.textContent || '登録';
    submitBtn.textContent = '送信中...';

    nameError.textContent = '';
    submitError.textContent = '';
    submitError.classList.add('hidden');

    // エラー処理のヘルパー関数
    const handleSubmissionError = (message: string) => {
      submitError.textContent = message;
      submitError.classList.remove('hidden');
      submitBtn.disabled = false;
      skipBtn.disabled = false;
      submitBtn.textContent = originalButtonText;
    };

    if (!navigator.onLine) {
      handleSubmissionError('オフラインです。後で再試行してください');
      return;
    }

    try {
      // スコアを秒からミリ秒に変換
      const clearTimeMs = Math.round(score * 1000);
      await submitScore(playerName, clearTimeMs, difficulty);
      closeModal();
    } catch (error) {
      console.error('Failed to submit score:', error);
      handleSubmissionError('スコアの登録に失敗しました');
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
