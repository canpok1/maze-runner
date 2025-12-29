import { describe, expect, it } from 'vitest';
import { getTestMaze, TEST_MAZES } from './fixtures';

describe('fixtures', () => {
  describe('TEST_MAZES', () => {
    it('simpleは5x5の迷路である', () => {
      const maze = TEST_MAZES.simple;
      expect(maze.size).toBe(5);
      expect(maze.tiles.length).toBe(5);
      expect(maze.tiles[0].length).toBe(5);
    });

    it('simpleはスタート(1,1)からゴール(3,1)への直線経路を持つ', () => {
      const maze = TEST_MAZES.simple;
      expect(maze.start).toEqual({ x: 1, y: 1 });
      expect(maze.goal).toEqual({ x: 3, y: 1 });
      // 経路が通行可能か確認
      expect(maze.tiles[1][1]).toBe(0); // FLOOR
      expect(maze.tiles[1][2]).toBe(0); // FLOOR
      expect(maze.tiles[1][3]).toBe(2); // GOAL
    });
  });

  describe('getTestMaze', () => {
    it('存在する迷路名を指定すると迷路データを返す', () => {
      const maze = getTestMaze('simple');
      expect(maze).toBeDefined();
      expect(maze?.size).toBe(5);
    });

    it('存在しない迷路名を指定するとundefinedを返す', () => {
      const maze = getTestMaze('nonexistent');
      expect(maze).toBeUndefined();
    });
  });
});
