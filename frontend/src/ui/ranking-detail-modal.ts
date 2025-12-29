import type { Ranking } from '../api-client/types';

/**
 * ランキング詳細モーダルを表示する
 * @param ranking ランキング情報
 * @param rank 順位
 */
export function showRankingDetailModal(ranking: Ranking, rank: number): void {
  const modal = document.getElementById('ranking-detail-modal');
  const rankDisplay = document.getElementById('detail-rank');
  const playerNameDisplay = document.getElementById('detail-player-name');
  const clearTimeDisplay = document.getElementById('detail-clear-time');
  const createdAtDisplay = document.getElementById('detail-created-at');
  const closeBtn = document.getElementById('detail-close-btn');

  if (
    !modal ||
    !rankDisplay ||
    !playerNameDisplay ||
    !clearTimeDisplay ||
    !createdAtDisplay ||
    !closeBtn
  ) {
    throw new Error('Required modal elements not found');
  }

  // 各情報を表示
  rankDisplay.textContent = `${rank}位`;
  playerNameDisplay.textContent = ranking.playerName;
  clearTimeDisplay.textContent = `${(ranking.clearTime / 1000).toFixed(2)}秒`;
  createdAtDisplay.textContent = new Date(ranking.createdAt).toLocaleString('ja-JP');

  // モーダルを表示
  modal.classList.remove('hidden');

  // モーダルを閉じる共通処理
  const closeModal = () => {
    modal.classList.add('hidden');

    // イベントリスナーを削除
    closeBtn.removeEventListener('click', handleCloseBtn);
    modal.removeEventListener('click', handleBackgroundClick);
    document.removeEventListener('keydown', handleEscKey);
  };

  // 閉じるボタンのイベントハンドラ
  const handleCloseBtn = () => {
    closeModal();
  };

  // 背景クリックのイベントハンドラ
  const handleBackgroundClick = (event: MouseEvent) => {
    // モーダルの背景（オーバーレイ）自体がクリックされた場合のみ閉じる
    if (event.target === modal) {
      closeModal();
    }
  };

  // ESCキーのイベントハンドラ
  const handleEscKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeModal();
    }
  };

  // イベントリスナーを追加
  closeBtn.addEventListener('click', handleCloseBtn);
  modal.addEventListener('click', handleBackgroundClick);
  document.addEventListener('keydown', handleEscKey);
}
