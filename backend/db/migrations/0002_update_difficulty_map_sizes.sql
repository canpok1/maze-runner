-- 難易度ごとのマップサイズを更新
UPDATE difficulties SET map_size = 11 WHERE name = 'easy';
UPDATE difficulties SET map_size = 17 WHERE name = 'normal';
UPDATE difficulties SET map_size = 23 WHERE name = 'hard';
