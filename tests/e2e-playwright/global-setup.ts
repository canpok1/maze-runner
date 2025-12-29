import { execSync } from 'node:child_process';

/**
 * Playwrightテスト全体の前に実行されるセットアップ
 * webServer起動前にDBをリセットする
 */
export default function globalSetup(): void {
  console.log('Resetting database before tests...');
  execSync('npm run test:e2e:reset-db', {
    stdio: 'inherit',
  });
  console.log('Database reset complete.');
}
