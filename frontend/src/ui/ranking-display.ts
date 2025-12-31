import { fetchRankings } from '../api-client/rankings';
import type { Difficulty, Ranking } from '../api-client/types';
import { showRankingDetailModal } from './ranking-detail-modal';

/**
 * ランキング画面を制御するオブジェクトの型定義
 */
export interface RankingControls {
  /** 現在選択中の難易度のランキングを再取得して表示を更新する */
  refresh: () => Promise<void>;
  /** ランキング画面を表示し、ランキングデータを取得する */
  show: () => Promise<void>;
  /** ランキング画面を非表示にする */
  hide: () => void;
}

/**
 * ランキング表示を初期化する
 * @returns ランキング画面を制御するオブジェクト
 * @throws {Error} 必須DOM要素が存在しない場合
 */
export async function initRankingDisplay(): Promise<RankingControls> {
  const rankingScreen = document.getElementById('ranking-screen');
  const rankingSection = document.getElementById('ranking-section');
  const rankingList = document.getElementById('ranking-list');
  const loadingElement = document.getElementById('ranking-loading');
  const emptyElement = document.getElementById('ranking-empty');
  const errorElement = document.getElementById('ranking-error');
  const backButton = document.getElementById('back-to-menu-btn');
  const tabs = document.querySelectorAll('.ranking-tab');

  if (
    !rankingScreen ||
    !rankingSection ||
    !rankingList ||
    !loadingElement ||
    !emptyElement ||
    !errorElement ||
    !backButton ||
    tabs.length === 0
  ) {
    throw new Error('Required ranking elements not found');
  }

  // 現在選択中の難易度を追跡（タブ切り替え時の重複リクエスト防止に使用）
  let currentDifficulty: Difficulty = 'easy';

  /**
   * 指定された難易度のランキングデータを取得して表示する
   * @param difficulty - 表示する難易度（'easy' | 'normal' | 'hard'）
   * @returns ランキング表示完了を示すPromise
   */
  const displayRankings = async (difficulty: Difficulty) => {
    loadingElement.classList.remove('hidden');
    emptyElement.classList.add('hidden');
    errorElement.classList.add('hidden');
    rankingList.innerHTML = '';

    try {
      const rankings = await fetchRankings(difficulty, 10);

      // リクエスト中に別のタブが選択された場合は、結果を破棄してUIの不整合を防ぐ
      if (difficulty !== currentDifficulty) {
        return;
      }

      loadingElement.classList.add('hidden');

      if (rankings.length === 0) {
        emptyElement.classList.remove('hidden');
        return;
      }

      const fragment = document.createDocumentFragment();
      rankings.forEach((ranking, index) => {
        const listItem = createRankingItem(ranking, index + 1);
        fragment.appendChild(listItem);
      });
      rankingList.appendChild(fragment);
    } catch (error) {
      // 古いリクエストからのエラーは無視する
      if (difficulty !== currentDifficulty) {
        return;
      }
      console.error('Failed to fetch rankings:', error);
      loadingElement.classList.add('hidden');

      if (!navigator.onLine) {
        errorElement.textContent = 'オフラインです';
      } else {
        errorElement.textContent = 'データの取得に失敗しました';
      }
      errorElement.classList.remove('hidden');
    }
  };

  /**
   * ランキングアイテムのDOM要素を作成する
   * @param ranking - 表示するランキングデータ
   * @param rank - 表示する順位（1から始まる）
   * @returns 構造化されたリストアイテム要素
   */
  const createRankingItem = (ranking: Ranking, rank: number): HTMLLIElement => {
    const listItem = document.createElement('li');
    listItem.className = 'ranking-item';

    const rankSpan = document.createElement('span');
    rankSpan.className = `ranking-rank${rank <= 3 ? ` rank-${rank}` : ''}`;
    rankSpan.textContent = `${rank}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'ranking-name';
    nameSpan.textContent = ranking.playerName;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'ranking-time';
    const timeInSeconds = (ranking.clearTime / 1000).toFixed(2);
    timeSpan.textContent = `${timeInSeconds}秒`;

    listItem.appendChild(rankSpan);
    listItem.appendChild(nameSpan);
    listItem.appendChild(timeSpan);

    // クリックで詳細モーダルを表示
    listItem.addEventListener('click', () => {
      showRankingDetailModal(ranking, rank);
    });

    return listItem;
  };

  /**
   * タブの active 状態を更新する
   * @param selectedDifficulty - アクティブにする難易度
   */
  const updateTabState = (selectedDifficulty: Difficulty) => {
    tabs.forEach((tab) => {
      const tabElement = tab as HTMLElement;
      const tabDifficulty = tabElement.dataset.difficulty;
      tabElement.classList.toggle('active', tabDifficulty === selectedDifficulty);
    });
  };

  tabs.forEach((tab) => {
    const tabElement = tab as HTMLElement;
    tabElement.addEventListener('click', async () => {
      const difficulty = tabElement.dataset.difficulty as Difficulty;
      if (difficulty && difficulty !== currentDifficulty) {
        currentDifficulty = difficulty;
        updateTabState(difficulty);
        await displayRankings(difficulty);
      }
    });
  });

  /**
   * ランキング画面を表示し、ランキングを再取得する
   */
  const showRankingScreen = async () => {
    rankingScreen.classList.remove('hidden');
    await displayRankings(currentDifficulty);
  };

  /**
   * ランキング画面を非表示にする
   */
  const hideRankingScreen = () => {
    rankingScreen.classList.add('hidden');
  };

  // 戻るボタンのクリックハンドラ
  backButton.addEventListener('click', hideRankingScreen);

  // 初期化時は画面を非表示にしておく（hiddenクラスは既にHTMLで設定されているが念のため）
  rankingScreen.classList.add('hidden');

  return {
    refresh: () => displayRankings(currentDifficulty),
    show: showRankingScreen,
    hide: hideRankingScreen,
  };
}
