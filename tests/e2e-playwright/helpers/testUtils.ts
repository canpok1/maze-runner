import { execSync } from 'node:child_process';

/**
 * テストデータをリセットする
 * rankingsテーブルのデータを削除し、シーケンスもリセットする
 */
export function resetDatabase(): void {
  execSync(
    'npx wrangler d1 execute maze-runner-db --local --command="DELETE FROM rankings; DELETE FROM sqlite_sequence WHERE name=\'rankings\';"',
    {
      cwd: 'backend',
      stdio: 'pipe',
    }
  );
}
