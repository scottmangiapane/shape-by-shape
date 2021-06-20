const chalk = require('chalk');
const fs = require('fs');

const input = fs
    .readFileSync('input.txt')
    .toString()
    .trim()
    .split('\n')
    .map(line => line.split(' '));

const r1 = [
    ['◣', '□'],
    ['■', '◣'],
];

const r2 = [
    ['◢', '■', '◤']
];

const r3 = [
    ['◢', '◣'],
    ['◥', '◤']
];

const y1 = [
    ['■', '◤'],
    ['■', '◣']
];

const y2 = [
    ['◢', '■', '■', '◣']
];

const y3 = [
    ['◢', '■', '■'],
    ['□', '□', '◥']
];

const y4 = [
    ['◢', '■', '◤'],
    ['◥', '◤', '□']
];

const redShapes = [r1, r1, r2, r2, r3, r3];
console.log(chalk.red(JSON.stringify(solve(input, redShapes))));

// invertPuzzle(input);

// const yellowShapes = [y1, y1, y2, y2, y3, y3, y4, y4];
// console.log(chalk.yellow(JSON.stringify(solve(input, yellowShapes))));

function solve(input, shapes) {
    const puzzle = JSON.parse(JSON.stringify(input));
    const pieces = shapes.map(shape => {
        return {
            shape: JSON.parse(JSON.stringify(shape)),
            xPos: null,
            yPos: null,
            transformStep: 0
        };
    });
    const solutions = [];
    recursive(puzzle, pieces, solutions, 0, 0);
    return solutions;
}

function recursive(puzzle, pieces, solutions, xLast, yLast) {
    if (pieces.length === 0) {
        return true;
    }
    const solutionPuzzle = buildPuzzle(puzzle[0].length, puzzle.length, solutions);
    console.log(chalk.dim(JSON.stringify(solutionPuzzle)));
    console.log(chalk.blue(JSON.stringify(solutions)));
    for (let i = 0; i < pieces.length; i++) {
        const piece = pieces.shift();
        for (let j = 0; j < 8; j++) {
            transform(piece);
            piece.xPos = xLast;
            piece.yPos = yLast;
            while (isOverlapping(solutionPuzzle, piece)) {
                piece.xPos++;
                if (isPieceOutsideX(puzzle, piece)) {
                    piece.xPos = 0;
                    piece.yPos++;
                }
            }
            if (isPieceOutsideY(puzzle, piece)) {
                continue;
            }
            if (isMismatch(puzzle, piece)) {
                continue;
            }
            solutions.push(piece);
            if (recursive(puzzle, pieces, solutions, piece.xPos, piece.yPos)) {
                return true;
            }
            solutions.pop();
        }
        pieces.push(piece);
    }
    return false;
}

function buildPuzzle(width, height, solutions) {
    const puzzle = [];
    for (let i = 0; i < height; i++) {
        puzzle.push((new Array(width)).fill('□'));
    }
    for (const piece of solutions) {
        for (let i = 0; i < piece.shape.length; i++) {
            for (let j = 0; j < piece.shape[i].length; j++) {
                const point1 = puzzle[i + piece.yPos][j + piece.xPos];
                const point2 = piece.shape[i][j];
                // console.log('union of ' + point1 + ' and ' + point2 + ' is ' + pointUnion(point1, point2));
                puzzle[i][j] = pointUnion(point1, point2);
            }
        }
    }
    return puzzle;
}

function pointUnion(point1, point2) {
    if (point1 === '□') { return point2; }
    if (point2 === '□') { return point1; }
    if (point1 === '■' || point2 === '■') { return '■'; }
    switch (point1) {
        case '◣':
            if (point2 === '◥') { return '■'; }
            return '◣';
        case '◢':
            if (point2 === '◤') { return '■'; }
            return '◢';
        case '◥':
            if (point2 === '◣') { return '■'; }
            return '◥';
        case '◤':
            if (point2 === '◢') { return '■'; }
            return '◤';
    }
}

function isOverlapping(puzzle, piece) {
    for (let i = 0; i < piece.shape.length; i++) {
        for (let j = 0; j < piece.shape[i].length; j++) {
            const puzzleX = j + piece.xPos;
            const puzzleY = i + piece.yPos;
            if (puzzleX < puzzle[0].length && puzzleY < puzzle.length) {
                const point1 = puzzle[puzzleY][puzzleX];
                const point2 = piece.shape[i][j];
                if (isOverlappingPoint(point1, point2)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isOverlappingPoint(point1, point2) {
    if (point1 === '□' || point2 === '□') {
        return false;
    }
    switch (point1) {
        case '◣':
            return point2 !== '◥';
        case '◢':
            return point2 !== '◤';
        case '◥':
            return point2 !== '◣';
        case '◤':
            return point2 !== '◢';
        case '■':
            return true;
    }
}

function isPieceOutsideX(puzzle, piece) {
    return piece.xPos + piece.shape[0].length > puzzle[0].length;
}

function isPieceOutsideY(puzzle, piece) {
    return piece.yPos + piece.shape.length > puzzle.length;
}

function isMismatch(puzzle, piece) {
    for (let i = 0; i < piece.shape.length; i++) {
        for (let j = 0; j < piece.shape[i].length; j++) {
            const container = puzzle[i + piece.yPos][j + piece.xPos];
            const contained = piece.shape[i][j];
            if (!doesPointContainPoint(container, contained)) {
                return true;
            }
        }
    }
    return false;
}

function doesPointContainPoint(container, contained) {
    if (container === '■') { return true; }
    if (contained === '□') { return true; }
    return container === contained;
}

function transform(piece) {
    piece.transformStep = (piece.transformStep + 1) % 8;
    rotate(piece.shape);
    if (piece.transformStep % 4 === 0) {
        flip(piece.shape);
    }
}

function flip(shape) {
    const dict = {
        '□': '□',
        '◣': '◤',
        '◢': '◥',
        '◥': '◢',
        '◤': '◣',
        '■': '■'
    };
    shape.reverse();
    for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
            shape[i][j] = dict[shape[i][j]];
        }
    }
}

function rotate(shape) {
    const dict = {
        '□': '□',
        '◣': '◤',
        '◢': '◣',
        '◥': '◢',
        '◤': '◥',
        '■': '■'
    };
    const original = JSON.parse(JSON.stringify(shape));
    shape.splice(0, shape.length);
    for (let i = 0; i < original.length; i++) {
        for (let j = 0; j < original[i].length; j++) {
            if (j === shape.length) {
                shape.push([]);
            }
            shape[j].unshift(dict[original[i][j]]);
        }
    }
}

function invertPuzzle(puzzle) {
    const dict = {
        '□': '■',
        '◣': '◥',
        '◢': '◤',
        '◥': '◣',
        '◤': '◢',
        '■': '□'
    };
    for (let i = 0; i < puzzle.length; i++) {
        for (let j = 0; j < puzzle[i].length; j++) {
            puzzle[i][j] = dict[puzzle[i][j]];
        }
    }
}