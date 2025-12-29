import { execSync } from 'node:child_process';

/**
 * テストデータをリセットする
 * rankingsテーブルのデータを削除し、シーケンスもリセットする
 */
export function resetDatabase(): void {
  execSync('npm run test:e2e:reset-db', {
    stdio: 'pipe',
  });
}
