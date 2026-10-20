const fs = require('fs');
const chalk = require('chalk');

// ============================================================
// Configuration
// ============================================================

const input = fs
    .readFileSync('input.txt', 'utf8')
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim().split(/\s+/));

// Choose which piece sets to solve.
const redShapes = [
    [['◣', '□'], ['■', '◣']],
    [['◣', '□'], ['■', '◣']],
    [['◢', '■', '◤']],
    [['◢', '■', '◤']],
    [['◢', '◣'], ['◥', '◤']],
    [['◢', '◣'], ['◥', '◤']],
];

const yellowShapes = [
    [['■', '◤'], ['■', '◣']],
    [['■', '◤'], ['■', '◣']],
    [['◢', '■', '■', '◣']],
    [['◢', '■', '■', '◣']],
    [['◢', '■', '■'], ['□', '□', '◥']],
    [['◢', '■', '■'], ['□', '□', '◥']],
    [['◢', '■', '◤'], ['◥', '◤', '□']],
    [['◢', '■', '◤'], ['◥', '◤', '□']],
];

const COLORS = [
    chalk.red,
    chalk.yellow,
    chalk.green,
    chalk.cyan,
    chalk.magenta,
    chalk.blue,
    chalk.white,
    chalk.redBright,
];

// ============================================================
// Symbols and rules
// ============================================================

const TRIANGLES = new Set(['◣', '◢', '◥', '◤']);

const COMPLEMENT = {
    '◣': '◥',
    '◥': '◣',
    '◢': '◤',
    '◤': '◢',
};

const ROTATE_SYMBOL = {
    '□': '□',
    '■': '■',
    '◣': '◤',
    '◢': '◣',
    '◥': '◢',
    '◤': '◥',
};

const FLIP_SYMBOL = {
    '□': '□',
    '■': '■',
    '◣': '◤',
    '◤': '◣',
    '◢': '◥',
    '◥': '◢',
};

// Merge contributions to a single cell.
// null means the contributions overlap illegally.
function merge(a, b) {
    if (a === '□') return b;
    if (b === '□') return a;

    // A full square cannot overlap another nontransparent cell.
    if (a === '■' || b === '■') return null;

    // Complementary triangles combine into a full square.
    if (COMPLEMENT[a] === b) return '■';

    return null;
}

// Can this partial cell still become the target symbol?
function compatible(target, current) {
    if (target === '□') {
        return current === '□';
    }

    if (TRIANGLES.has(target)) {
        return current === '□' || current === target;
    }

    if (target === '■') {
        return current === '□' ||
            current === '■' ||
            TRIANGLES.has(current);
    }

    return false;
}

// ============================================================
// Board inversion
// ============================================================

// Build the complementary target for the other color layer.
function invertPuzzle(board) {
    const invert = {
        '□': '■',
        '■': '□',
        '◣': '◥',
        '◥': '◣',
        '◢': '◤',
        '◤': '◢',
    };

    return board.map(row => row.map(cell => {
        if (invert[cell] === undefined) {
            throw new Error(`Unknown board symbol: ${cell}`);
        }

        return invert[cell];
    }));
}

// ============================================================
// Piece transformations
// ============================================================

function rotate(shape) {
    const height = shape.length;
    const width = shape[0].length;

    const result = Array.from(
        { length: width },
        () => Array(height)
    );

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            result[x][height - 1 - y] =
                ROTATE_SYMBOL[shape[y][x]];
        }
    }

    return result;
}

function flip(shape) {
    return shape
        .slice()
        .reverse()
        .map(row => row.map(cell => FLIP_SYMBOL[cell]));
}

function shapeKey(shape) {
    return JSON.stringify(shape);
}

// Generate unique rotations and reflections for a piece.
function orientations(original) {
    const result = [];
    const seen = new Set();

    for (let reflected = 0; reflected < 2; reflected++) {
        let shape = original.map(row => [...row]);

        if (reflected) {
            shape = flip(shape);
        }

        for (let rotation = 0; rotation < 4; rotation++) {
            const key = shapeKey(shape);

            if (!seen.has(key)) {
                seen.add(key);
                result.push(shape.map(row => [...row]));
            }

            shape = rotate(shape);
        }
    }

    return result;
}

// ============================================================
// Solver
// ============================================================

function solve(target, pieces) {
    const height = target.length;
    const width = target[0].length;

    if (!target.every(row => row.length === width)) {
        throw new Error('All board rows must have the same width.');
    }

    const validSymbols = new Set(['□', '■', ...TRIANGLES]);

    for (const row of target) {
        for (const cell of row) {
            if (!validSymbols.has(cell)) {
                throw new Error(`Unknown target symbol: ${cell}`);
            }
        }
    }

    for (const piece of pieces) {
        if (
            piece.length === 0 ||
            piece[0].length === 0 ||
            !piece.every(row => row.length === piece[0].length)
        ) {
            throw new Error('Every piece must be a nonempty rectangle.');
        }
    }

    const variants = pieces.map(orientations);
    const failed = new Set();

    const emptyBoard = Array.from(
        { length: height },
        () => Array(width).fill('□')
    );

    // Try a placement, returning a new board if legal.
    function place(board, shape, x, y) {
        const next = board.map(row => [...row]);

        // The entire piece rectangle must fit on the board.
        if (
            x < 0 || y < 0 ||
            x + shape[0].length > width ||
            y + shape.length > height
        ) {
            return null;
        }

        for (let dy = 0; dy < shape.length; dy++) {
            for (let dx = 0; dx < shape[dy].length; dx++) {
                const cell = shape[dy][dx];

                // Transparent cells contribute nothing.
                if (cell === '□') continue;

                const px = x + dx;
                const py = y + dy;

                const combined = merge(next[py][px], cell);

                if (combined === null) return null;

                if (!compatible(target[py][px], combined)) {
                    return null;
                }

                next[py][px] = combined;
            }
        }

        return next;
    }

    function isComplete(board) {
        return board.every((row, y) =>
            row.every((cell, x) => cell === target[y][x])
        );
    }

    function search(index, board, placements) {
        // All pieces have been placed. Check the entire target.
        if (index === pieces.length) {
            return isComplete(board)
                ? placements.map(p => ({
                    ...p,
                    shape: p.shape.map(row => [...row]),
                }))
                : null;
        }

        // The next piece is fixed by index. Therefore the index
        // also determines exactly which pieces have been used.
        const stateKey = `${index}:${JSON.stringify(board)}`;

        if (failed.has(stateKey)) return null;

        for (let orientation = 0;
             orientation < variants[index].length;
             orientation++) {

            const shape = variants[index][orientation];

            for (let y = 0; y <= height - shape.length; y++) {
                for (let x = 0; x <= width - shape[0].length; x++) {
                    const next = place(board, shape, x, y);

                    if (next === null) continue;

                    placements.push({
                        piece: index,
                        x,
                        y,
                        orientation,
                        shape,
                    });

                    const result = search(index + 1, next, placements);

                    if (result !== null) return result;

                    // Undo the placement before trying another branch.
                    placements.pop();
                }
            }
        }

        failed.add(stateKey);
        return null;
    }

    const placements = search(0, emptyBoard, []);

    if (placements === null) return null;

    // Independently reconstruct the final board from the placements.
    const finalBoard = emptyBoard.map(row => [...row]);
    const used = new Set();

    for (const p of placements) {
        if (used.has(p.piece)) {
            throw new Error(`Piece ${p.piece + 1} was used more than once.`);
        }

        used.add(p.piece);

        const next = place(finalBoard, p.shape, p.x, p.y);

        if (next === null) {
            throw new Error(`Invalid placement for piece ${p.piece + 1}.`);
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                finalBoard[y][x] = next[y][x];
            }
        }
    }

    if (used.size !== pieces.length) {
        throw new Error('Not every piece was used.');
    }

    if (!isComplete(finalBoard)) {
        throw new Error('Reconstructed board does not match target.');
    }

    return { placements, board: finalBoard };
}

// ============================================================
// Terminal visualization
// ============================================================

function printBoard(board, title = '') {
    if (title) console.log(`\n${title}`);

    const width = board[0].length;
    const border = '─'.repeat(width * 3 + 1);

    console.log(`┌${border}┐`);

    for (const row of board) {
        console.log(
            '│ ' +
            row.map(cell => cell === '□' ? '·' : cell).join('  ') +
            ' │'
        );
    }

    console.log(`└${border}┘`);
}

function makePieceBoard(width, height, placement, color) {
    const board = Array.from(
        { length: height },
        () => Array(width).fill('·')
    );

    for (let dy = 0; dy < placement.shape.length; dy++) {
        for (let dx = 0; dx < placement.shape[dy].length; dx++) {
            const cell = placement.shape[dy][dx];

            if (cell === '□') continue;

            const x = placement.x + dx;
            const y = placement.y + dy;

            board[y][x] = color(cell);
        }
    }

    return board;
}

function printVisualSolution(label, solution, target) {
    console.log(chalk.bold(`\n${label}`));

    if (solution === null) {
        console.log(chalk.red('No solution found.'));
        return;
    }

    const height = target.length;
    const width = target[0].length;

    console.log(chalk.bold('\nPieces in their solved positions:'));

    for (const p of solution.placements) {
        const color = COLORS[p.piece % COLORS.length];

        printBoard(
            makePieceBoard(width, height, p, color),
            color(`Piece ${p.piece + 1} — x=${p.x}, y=${p.y}`)
        );
    }

    console.log(chalk.bold('\nCompleted layer:'));

    printBoard(
        solution.board.map(row =>
            row.map(cell => {
                if (cell === '□') return chalk.gray('·');
                if (cell === '■') return chalk.white.bold(cell);
                return chalk.white(cell);
            })
        )
    );

    console.log(
        chalk.green(
            `Verified: ${solution.placements.length} distinct pieces, ` +
            'each used exactly once.'
        )
    );
}

// ============================================================
// Main
// ============================================================

console.log(chalk.bold('\nSolving red layer...'));
const redSolution = solve(input, redShapes);

printVisualSolution('🔴 RED LAYER', redSolution, input);

console.log(chalk.bold('\nSolving yellow layer...'));
const yellowTarget = invertPuzzle(input);
const yellowSolution = solve(yellowTarget, yellowShapes);

printVisualSolution('🟡 YELLOW LAYER', yellowSolution, yellowTarget);

if (redSolution !== null && yellowSolution !== null) {
    console.log(chalk.green.bold('\nBoth layers solved successfully!'));

    console.log(
        `Red: ${redSolution.placements.length}/${redShapes.length} pieces`
    );

    console.log(
        `Yellow: ${yellowSolution.placements.length}/${yellowShapes.length} pieces`
    );
} else {
    console.log(
        chalk.yellow(
            '\nAt least one layer has no solution with the current rules.'
        )
    );
}

