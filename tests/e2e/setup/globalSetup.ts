import { spawn, execSync, type ChildProcess } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

const BASE_URL = 'http://localhost:8787';
const MAX_WAIT_ATTEMPTS = 30;
const WAIT_INTERVAL_MS = 1000;

let serverProcess: ChildProcess | undefined;

export default async function globalSetup(): Promise<() => Promise<void>> {
  console.log('Starting E2E test setup...');

  // 1. マイグレーションを適用
  console.log('Applying migrations...');
  execSync('npm run migrate', {
    cwd: 'backend',
    stdio: 'inherit',
  });

  // 2. wrangler dev --local を起動
  console.log('Starting wrangler dev server...');
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: 'backend',
    stdio: 'pipe',
    detached: true,
  });

  // 標準出力・エラー出力をログに表示
  serverProcess.stdout?.on('data', (data) => {
    console.log(`[wrangler stdout] ${data.toString().trim()}`);
  });
  serverProcess.stderr?.on('data', (data) => {
    console.log(`[wrangler stderr] ${data.toString().trim()}`);
  });

  // 3. ヘルスチェックでサーバー起動完了を待機
  console.log('Waiting for server to be ready...');
  for (let i = 0; i < MAX_WAIT_ATTEMPTS; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        console.log('Server is ready!');
        // teardown関数を返す
        return async () => {
          console.log('Stopping E2E test server...');
          if (serverProcess?.pid) {
            try {
              process.kill(-serverProcess.pid, 'SIGTERM');
              console.log('Server stopped.');
            } catch {
              console.log('Server process already terminated.');
            }
          }
        };
      }
    } catch {
      // サーバーがまだ起動していない
    }
    await sleep(WAIT_INTERVAL_MS);
  }

  // タイムアウト時はサーバーを停止してエラー
  if (serverProcess.pid) {
    try {
      process.kill(-serverProcess.pid, 'SIGTERM');
    } catch {
      // プロセスが既に終了している場合は無視
    }
  }
  throw new Error('Server failed to start within timeout');
}
