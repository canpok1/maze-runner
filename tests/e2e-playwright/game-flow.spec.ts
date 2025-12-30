import { expect, test } from '@playwright/test';

test.describe
  .serial('ゲームクリアフロー', () => {
    test('固定迷路でゲームをクリアし、スコア登録後にランキングが自動更新される', async ({
      page,
    }) => {
      // テスト用固定迷路でゲームを開始
      await page.goto('/?testMaze=simple');

      // メニュー画面が表示されていることを確認
      await expect(page.locator('#menu')).toBeVisible();

      // Easy難易度でゲーム開始（サイズは固定迷路で上書きされる）
      await page.click('.diff-btn[data-size="11"]');

      // ゲームが開始されたことを確認（メニューが非表示）
      await expect(page.locator('#menu')).toBeHidden();
      await expect(page.locator('#gameCanvas')).toBeVisible();

      // 前進キーを押して2マス移動（固定迷路は右に2マスでゴール、プレイヤーは東向きでスタート）
      // キーボードで移動（ArrowUpを押しっぱなし）
      await page.keyboard.down('ArrowUp');

      // ゴールに到達するまで待機（最大10秒）
      await expect(page.locator('#score-modal')).toBeVisible({ timeout: 10000 });

      await page.keyboard.up('ArrowUp');

      // スコア登録モーダルが表示されていることを確認
      await expect(page.locator('#score-modal')).toBeVisible();

      // 名前を入力（20文字制限があるため短い名前を使用）
      const testPlayerName = `TP_${Date.now()}`;
      await page.locator('#player-name').fill(testPlayerName);

      // 登録ボタンをクリック
      await page.click('#submit-score-btn');

      // 登録完了を待つ（モーダルが閉じる or 成功メッセージ）
      // スキップか登録後、メニューに戻るまで待機
      await expect(page.locator('#menu')).toBeVisible({ timeout: 10000 });

      // ランキングセクションが表示されていることを確認
      const rankingSection = page.locator('#ranking-section');
      await expect(rankingSection).toBeVisible();

      // スコア登録後、自動でランキングが更新されることを確認（リロード不要）
      // ランキングリストに登録した名前が表示されることを確認
      await expect(page.locator('#ranking-list')).toContainText(testPlayerName, { timeout: 10000 });
    });

    test('スコア登録をスキップしてもメニューに戻れる', async ({ page }) => {
      await page.goto('/?testMaze=simple');

      // ゲーム開始
      await page.click('.diff-btn[data-size="11"]');

      // 前進キーを押してゴール到達（プレイヤーは東向きでスタート）
      await page.keyboard.down('ArrowUp');
      await expect(page.locator('#score-modal')).toBeVisible({ timeout: 10000 });
      await page.keyboard.up('ArrowUp');

      // スキップボタンをクリック
      await page.click('#skip-score-btn');

      // メニューに戻ることを確認
      await expect(page.locator('#menu')).toBeVisible({ timeout: 5000 });
    });
  });

test.describe('通常モード', () => {
  test('testMazeパラメータなしで通常の迷路が生成される', async ({ page }) => {
    await page.goto('/');

    // メニュー画面が表示されていることを確認
    await expect(page.locator('#menu')).toBeVisible();

    // ゲーム開始
    await page.click('.diff-btn[data-size="11"]');

    // ゲームが開始されたことを確認
    await expect(page.locator('#menu')).toBeHidden();
    await expect(page.locator('#gameCanvas')).toBeVisible();
  });
});

test.describe('エラーハンドリング', () => {
  test('APIエラー時にランキングエラーメッセージが表示される', async ({ page }) => {
    // APIリクエストをインターセプトしてエラーを返す
    await page.route('**/api/rankings**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('#ranking-error')).toBeVisible({ timeout: 5000 });
  });

  test('オフライン時にランキングエラーメッセージが表示される', async ({ page, context }) => {
    // 最初は正常に読み込む
    await page.goto('/');
    await expect(page.locator('#menu')).toBeVisible();

    // オフラインに切り替え
    await context.setOffline(true);

    // 別のタブをクリックしてランキングを再取得
    await page.click('.ranking-tab[data-difficulty="normal"]');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('#ranking-error')).toBeVisible({ timeout: 5000 });

    // オフライン状態をリセット
    await context.setOffline(false);
  });

  test('スコア登録失敗時にエラーメッセージが表示される', async ({ page }) => {
    // スコア登録APIをエラーにする
    await page.route('**/api/rankings', (route, request) => {
      if (request.method() === 'POST') {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/?testMaze=simple');

    // ゲーム開始
    await page.click('.diff-btn[data-size="11"]');

    // ゴールに到達
    await page.keyboard.down('ArrowUp');
    await expect(page.locator('#score-modal')).toBeVisible({ timeout: 10000 });
    await page.keyboard.up('ArrowUp');

    // 名前を入力して登録
    await page.locator('#player-name').fill('TestPlayer');
    await page.click('#submit-score-btn');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('#submit-error')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#submit-error')).toContainText('スコアの登録に失敗しました');

    // モーダルがまだ表示されていることを確認（閉じない）
    await expect(page.locator('#score-modal')).toBeVisible();
  });

  test('スコア送信中はボタンテキストが「送信中...」に変わる', async ({ page }) => {
    // APIレスポンスを遅延させる
    await page.route('**/api/rankings', async (route, request) => {
      if (request.method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        route.continue();
      } else {
        route.continue();
      }
    });

    await page.goto('/?testMaze=simple');
    await page.click('.diff-btn[data-size="11"]');

    await page.keyboard.down('ArrowUp');
    await expect(page.locator('#score-modal')).toBeVisible({ timeout: 10000 });
    await page.keyboard.up('ArrowUp');

    await page.locator('#player-name').fill('TestPlayer');
    await page.click('#submit-score-btn');

    // ボタンテキストが「送信中...」に変わることを確認
    await expect(page.locator('#submit-score-btn')).toContainText('送信中...');
  });
});
