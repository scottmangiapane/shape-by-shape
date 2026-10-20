const assert = require('node:assert/strict');
const Solver = require('../solver.js');

const example = Solver.solveBoth(Solver.EXAMPLE_BOARD);
assert.ok(example.red, 'the example red layer should be solvable');
assert.ok(example.yellow, 'the example yellow layer should be solvable');
assert.equal(example.red.placements.length, 6);
assert.equal(example.yellow.placements.length, 8);

const unique = new Set();
for (let i = 0; i < 8; i++) {
  const puzzle = Solver.generatePuzzle();
  const solution = Solver.solveBoth(puzzle.board);
  assert.ok(solution.red, `generated puzzle ${i + 1} should have a red-layer solution`);
  assert.ok(solution.yellow, `generated puzzle ${i + 1} should have a yellow-layer solution`);
  assert.equal(solution.red.placements.length, 6);
  assert.equal(solution.yellow.placements.length, 8);
  assert.notDeepEqual(puzzle.board, Solver.EXAMPLE_BOARD, 'the generator should not fall back to the sample board');
  unique.add(JSON.stringify(puzzle.board));
}
assert.ok(unique.size >= 6, 'repeated generation should offer genuinely different layouts');

const filledBoard = symbol => Array.from({ length: 6 }, () => Array(6).fill(symbol));
const impossibleBoards = [
  ['all yellow / empty red layer', filledBoard('□')],
  ['all red / full board', filledBoard('■')],
  ['only one square', (() => { const board = filledBoard('□'); board[0][0] = '■'; return board; })()],
  ['almost all squares', (() => { const board = filledBoard('■'); board[0][0] = '□'; return board; })()],
];
for (const [name, board] of impossibleBoards) {
  const start = performance.now();
  const result = Solver.solveBoth(board);
  assert.equal(result.red, null, `${name} should be rejected by the red solver`);
  assert.equal(result.yellow, null, `${name} should be rejected by the yellow solver`);
  assert.ok(performance.now() - start < 250, `${name} should fail quickly instead of hanging`);
}

console.log(`Solver tests passed. Verified the sample, ${unique.size} distinct generated boards, and ${impossibleBoards.length} quickly rejected invalid boards.`);
