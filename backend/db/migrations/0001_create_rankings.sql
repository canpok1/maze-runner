-- 外部キー制約を有効化
PRAGMA foreign_keys = ON;

-- 難易度マスターテーブル
CREATE TABLE IF NOT EXISTS difficulties (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  map_size INTEGER NOT NULL
);

-- ランキングテーブル
CREATE TABLE IF NOT EXISTS rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  clear_time INTEGER NOT NULL,
  difficulty_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (difficulty_id) REFERENCES difficulties(id)
);

-- 難易度の初期データ
INSERT INTO difficulties (id, name, map_size) VALUES
  (1, 'easy', 10),
  (2, 'normal', 15),
  (3, 'hard', 20);
