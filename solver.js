(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ShapeByShapeSolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RED_SHAPES = [
    [['◣', '□'], ['■', '◣']],
    [['◣', '□'], ['■', '◣']],
    [['◢', '■', '◤']],
    [['◢', '■', '◤']],
    [['◢', '◣'], ['◥', '◤']],
    [['◢', '◣'], ['◥', '◤']],
  ];
  const YELLOW_SHAPES = [
    [['■', '◤'], ['■', '◣']],
    [['■', '◤'], ['■', '◣']],
    [['◢', '■', '■', '◣']],
    [['◢', '■', '■', '◣']],
    [['◢', '■', '■'], ['□', '□', '◥']],
    [['◢', '■', '■'], ['□', '□', '◥']],
    [['◢', '■', '◤'], ['◥', '◤', '□']],
    [['◢', '■', '◤'], ['◥', '◤', '□']],
  ];

  const EMPTY = '□';
  const SQUARE = '■';
  const TRIANGLES = new Set(['◣', '◢', '◥', '◤']);
  const COMPLEMENT = { '◣': '◥', '◥': '◣', '◢': '◤', '◤': '◢' };
  const ROTATE_SYMBOL = { '□': '□', '■': '■', '◣': '◤', '◢': '◣', '◥': '◢', '◤': '◥' };
  const FLIP_SYMBOL = { '□': '□', '■': '■', '◣': '◤', '◤': '◣', '◢': '◥', '◥': '◢' };
  const INVERT_SYMBOL = { '□': '■', '■': '□', '◣': '◥', '◥': '◣', '◢': '◤', '◤': '◢' };
  const EXAMPLE_BOARD = [
    ['□', '◢', '◣', '□', '□', '□'],
    ['□', '◥', '■', '□', '□', '□'],
    ['□', '□', '■', '□', '□', '◢'],
    ['□', '□', '■', '■', '■', '■'],
    ['□', '□', '◥', '■', '◥', '◤'],
    ['□', '□', '◢', '■', '□', '□'],
  ];

  class SearchLimitError extends Error {
    constructor(limit) {
      super(`Search stopped after ${limit.toLocaleString()} states to keep the page responsive.`);
      this.name = 'SearchLimitError';
      this.limit = limit;
    }
  }

  function cloneBoard(board) { return board.map(row => row.slice()); }
  function shapeKey(shape) { return JSON.stringify(shape); }
  function symbolArea(symbol) { return symbol === SQUARE ? 1 : TRIANGLES.has(symbol) ? 0.5 : 0; }
  function boardArea(board) { return board.flat().reduce((sum, symbol) => sum + symbolArea(symbol), 0); }
  function shapesArea(shapes) { return shapes.reduce((sum, shape) => sum + boardArea(shape), 0); }

  function merge(a, b) {
    if (a === EMPTY) return b;
    if (b === EMPTY) return a;
    if (a === SQUARE || b === SQUARE) return null;
    if (COMPLEMENT[a] === b) return SQUARE;
    return null;
  }

  function compatible(target, current) {
    if (target === EMPTY) return current === EMPTY;
    if (TRIANGLES.has(target)) return current === EMPTY || current === target;
    if (target === SQUARE) return current === EMPTY || current === SQUARE || TRIANGLES.has(current);
    return false;
  }

  function invertPuzzle(board) {
    return board.map(row => row.map(cell => {
      if (INVERT_SYMBOL[cell] === undefined) throw new Error(`Unknown board symbol: ${cell}`);
      return INVERT_SYMBOL[cell];
    }));
  }

  function rotateShape(shape) {
    const height = shape.length;
    const width = shape[0].length;
    const result = Array.from({ length: width }, () => Array(height));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) result[x][height - 1 - y] = ROTATE_SYMBOL[shape[y][x]];
    return result;
  }

  function flipShape(shape) {
    return shape.slice().reverse().map(row => row.map(cell => FLIP_SYMBOL[cell]));
  }

  function orientations(original) {
    const result = [];
    const seen = new Set();
    for (let reflected = 0; reflected < 2; reflected++) {
      let shape = original.map(row => row.slice());
      if (reflected) shape = flipShape(shape);
      for (let rotation = 0; rotation < 4; rotation++) {
        const key = shapeKey(shape);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(shape.map(row => row.slice()));
        }
        shape = rotateShape(shape);
      }
    }
    return result;
  }

  function validateBoard(target) {
    if (!Array.isArray(target) || target.length === 0 || !Array.isArray(target[0]) || target[0].length === 0) {
      throw new Error('The board must contain at least one row and one column.');
    }
    const width = target[0].length;
    if (!target.every(row => Array.isArray(row) && row.length === width)) throw new Error('All board rows must have the same width.');
    const valid = new Set([EMPTY, SQUARE, ...TRIANGLES]);
    for (const row of target) for (const cell of row) if (!valid.has(cell)) throw new Error(`Unknown board symbol: ${cell}`);
  }

  function solveLayer(target, pieces, options = {}) {
    validateBoard(target);
    const height = target.length;
    const width = target[0].length;
    for (const piece of pieces) {
      if (!piece.length || !piece[0].length || !piece.every(row => row.length === piece[0].length)) {
        throw new Error('Every piece must be a nonempty rectangle.');
      }
      validateBoard(piece);
    }

    // Exact area is a necessary condition because only complementary triangles
    // may overlap, and their combined area is exactly one square.
    if (Math.abs(boardArea(target) - shapesArea(pieces)) > 0.001) return null;

    const random = typeof options.random === 'function' ? options.random : null;
    const maxNodes = options.maxNodes == null ? 180000 : options.maxNodes;
    const variants = pieces.map(orientations);
    const placementOptions = variants.map(pieceVariants => {
      const choices = [];
      for (let orientation = 0; orientation < pieceVariants.length; orientation++) {
        const shape = pieceVariants[orientation];
        for (let y = 0; y <= height - shape.length; y++) {
          for (let x = 0; x <= width - shape[0].length; x++) {
            choices.push({ orientation, shape, x, y });
          }
        }
      }
      return random ? shuffle(choices, random) : choices;
    });

    // Index each legal placement by the board cells it contributes to. Search
    // branches from an unfinished target cell instead of blindly placing pieces;
    // this is far more restrictive on impossible puzzles and randomized tilings.
    const placementsByCell = pieces.map(() => Array.from({ length: width * height }, () => []));
    placementOptions.forEach((choices, pieceIndex) => {
      for (const choice of choices) {
        choice.shape.forEach((row, dy) => row.forEach((symbol, dx) => {
          if (symbol === EMPTY) return;
          const x = choice.x + dx;
          const y = choice.y + dy;
          placementsByCell[pieceIndex][y * width + x].push({ choice, symbol });
        }));
      }
    });

    const emptyBoard = Array.from({ length: height }, () => Array(width).fill(EMPTY));
    const failed = new Set();
    let visited = 0;

    function place(current, choice) {
      const next = cloneBoard(current);
      for (let dy = 0; dy < choice.shape.length; dy++) {
        for (let dx = 0; dx < choice.shape[dy].length; dx++) {
          const symbol = choice.shape[dy][dx];
          if (symbol === EMPTY) continue;
          const py = choice.y + dy;
          const px = choice.x + dx;
          const combined = merge(next[py][px], symbol);
          if (combined === null || !compatible(target[py][px], combined)) return null;
          next[py][px] = combined;
        }
      }
      return next;
    }

    function isComplete(current) {
      return current.every((row, y) => row.every((symbol, x) => symbol === target[y][x]));
    }

    function search(remainingMask, current, placements) {
      if (remainingMask === 0) {
        return isComplete(current) ? placements.map(p => ({ ...p, shape: cloneBoard(p.shape) })) : null;
      }
      if (++visited > maxNodes) throw new SearchLimitError(maxNodes);
      const stateKey = `${remainingMask}:${JSON.stringify(current)}`;
      if (failed.has(stateKey)) return null;

      let chosenCandidates = null;
      let incompleteFound = false;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (current[y][x] === target[y][x]) continue;
          incompleteFound = true;
          const candidates = [];
          const cellIndex = y * width + x;
          for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
            if (!(remainingMask & (1 << pieceIndex))) continue;
            for (const indexedChoice of placementsByCell[pieceIndex][cellIndex]) {
              const next = place(current, indexedChoice.choice);
              if (next !== null) candidates.push({ piece: pieceIndex, choice: indexedChoice.choice, next });
            }
          }
          if (candidates.length === 0) {
            failed.add(stateKey);
            return null;
          }
          if (chosenCandidates === null || candidates.length < chosenCandidates.length) {
            chosenCandidates = candidates;
            if (candidates.length === 1) break;
          }
        }
        if (chosenCandidates && chosenCandidates.length === 1) break;
      }

      // If every target cell already matches but pieces remain, something is
      // inconsistent; valid exact-area pieces cannot be added without conflict.
      if (!incompleteFound || chosenCandidates === null) {
        failed.add(stateKey);
        return null;
      }

      if (random) shuffle(chosenCandidates, random);
      for (const candidate of chosenCandidates) {
        placements.push({
          piece: candidate.piece,
          x: candidate.choice.x,
          y: candidate.choice.y,
          orientation: candidate.choice.orientation,
          shape: candidate.choice.shape,
        });
        const result = search(remainingMask & ~(1 << candidate.piece), candidate.next, placements);
        if (result !== null) return result;
        placements.pop();
      }
      failed.add(stateKey);
      return null;
    }

    const allPiecesMask = (1 << pieces.length) - 1;
    const placements = search(allPiecesMask, emptyBoard, []);
    if (placements === null) return null;

    let reconstructed = cloneBoard(emptyBoard);
    for (const placement of placements) {
      const next = place(reconstructed, placement);
      if (next === null) throw new Error(`Invalid placement for piece ${placement.piece + 1}.`);
      reconstructed = next;
    }
    if (!isComplete(reconstructed)) throw new Error('Reconstructed board does not match target.');
    return { placements, board: reconstructed, visited };
  }

  function solveBoth(board, options = {}) {
    validateBoard(board);
    return {
      red: solveLayer(board, RED_SHAPES, options),
      yellow: solveLayer(invertPuzzle(board), YELLOW_SHAPES, options),
      yellowTarget: invertPuzzle(board),
    };
  }

  function shuffle(items, random) {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function transformBoard(source, rotations, reflect) {
    let board = cloneBoard(source);
    if (reflect) board = board.slice().reverse().map(row => row.map(cell => FLIP_SYMBOL[cell]));
    for (let i = 0; i < rotations; i++) {
      const h = board.length, w = board[0].length;
      const next = Array.from({ length: w }, () => Array(h));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) next[x][h - 1 - y] = ROTATE_SYMBOL[board[y][x]];
      board = next;
    }
    return board;
  }

  function composePlacements(placements, width = 6, height = 6) {
    const board = Array.from({ length: height }, () => Array(width).fill(EMPTY));
    for (const placement of placements) {
      for (let dy = 0; dy < placement.shape.length; dy++) {
        for (let dx = 0; dx < placement.shape[dy].length; dx++) {
          const symbol = placement.shape[dy][dx];
          if (symbol === EMPTY) continue;
          const x = placement.x + dx;
          const y = placement.y + dy;
          if (x < 0 || y < 0 || x >= width || y >= height) return null;
          const combined = merge(board[y][x], symbol);
          if (combined === null) return null;
          board[y][x] = combined;
        }
      }
    }
    return board;
  }

  function generatePuzzle(options = {}) {
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const attempts = options.attempts == null ? 4 : options.attempts;
    const maxNodes = options.maxNodes == null ? 40000 : options.maxNodes;
    const fullBoard = Array.from({ length: 6 }, () => Array(6).fill(SQUARE));
    const allPieces = [...RED_SHAPES, ...YELLOW_SHAPES];
    let lastLimitError = null;

    // Randomly tile the complete board with all fourteen physical pieces at once.
    // The red placements directly define the puzzle; the complementary yellow
    // placements prove that its second layer has a solution. No sample-board
    // fallback is used, so each generation explores a genuinely shuffled layout.
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const tiling = solveLayer(fullBoard, allPieces, { random, maxNodes });
        if (!tiling) continue;
        const redPlacements = tiling.placements.filter(p => p.piece < RED_SHAPES.length);
        const yellowPlacements = tiling.placements.filter(p => p.piece >= RED_SHAPES.length);
        const board = composePlacements(redPlacements);
        const yellowBoard = composePlacements(yellowPlacements.map(p => ({ ...p, piece: p.piece - RED_SHAPES.length })));
        if (!board || !yellowBoard) continue;
        if (JSON.stringify(invertPuzzle(board)) !== JSON.stringify(yellowBoard)) continue;
        if (JSON.stringify(board) === JSON.stringify(EXAMPLE_BOARD)) continue;
        return { board, source: 'random-tiling' };
      } catch (error) {
        if (!(error instanceof SearchLimitError)) throw error;
        lastLimitError = error;
      }
    }

    if (lastLimitError) {
      throw new Error('Could not find a randomized puzzle within the search budget. Please try Generate puzzle again.');
    }
    throw new Error('Could not generate a valid puzzle. Please try again.');
  }

  return {
    RED_SHAPES,
    YELLOW_SHAPES,
    EXAMPLE_BOARD,
    TRIANGLES: [...TRIANGLES],
    SearchLimitError,
    invertPuzzle,
    solveLayer,
    solveBoth,
    generatePuzzle,
    transformBoard,
    validateBoard,
  };
});
