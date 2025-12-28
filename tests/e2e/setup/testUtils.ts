import { execSync } from 'node:child_process';

export const BASE_URL = 'http://localhost:8787';

/**
 * テストデータをリセットする
 * rankingsテーブルのデータを削除し、シーケンスもリセットする
 */
export async function resetDatabase(): Promise<void> {
  execSync(
    'npx wrangler d1 execute maze-runner-db --local --command="DELETE FROM rankings; DELETE FROM sqlite_sequence WHERE name=\'rankings\';"',
    {
      cwd: 'backend',
      stdio: 'pipe',
    }
  );
}

/**
 * APIエンドポイントにリクエストを送信する
 * @param path APIパス（/api/以降）
 * @param options fetchオプション
 * @returns レスポンス
 */
export async function apiRequest(path: string, options?: RequestInit): Promise<Response> {
  const url = `${BASE_URL}/api${path}`;
  return fetch(url, options);
}
