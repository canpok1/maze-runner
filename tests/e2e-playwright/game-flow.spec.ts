import { expect, test } from '@playwright/test';

test.describe('ゲームクリアフロー', () => {
  test('固定迷路でゲームをクリアし、スコア登録してランキングに表示される', async ({ page }) => {
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

    // 名前を入力
    const testPlayerName = `TestPlayer_${Date.now()}`;
    await page.locator('#player-name').fill(testPlayerName);

    // 登録ボタンをクリック
    await page.click('#submit-score-btn');

    // 登録完了を待つ（モーダルが閉じる or 成功メッセージ）
    // スキップか登録後、メニューに戻るまで待機
    await expect(page.locator('#menu')).toBeVisible({ timeout: 10000 });

    // ランキングセクションが表示されていることを確認
    const rankingSection = page.locator('#ranking-section');
    await expect(rankingSection).toBeVisible();

    // ページをリロードしてランキングデータを再取得
    await page.reload();
    await expect(page.locator('#menu')).toBeVisible();

    // ランキングリストに登録した名前が表示されることを確認
    // 名前はテスト実行ごとにユニークなため、実際に登録した名前を検索
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
