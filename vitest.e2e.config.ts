import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    globalSetup: ['./tests/e2e/setup/globalSetup.ts'],
    teardownTimeout: 10000,
    // テストの並列実行を無効化（DB状態の競合を防ぐ）
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // タイムアウトを長めに設定
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
