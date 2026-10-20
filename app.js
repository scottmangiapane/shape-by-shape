(() => {
  'use strict';

  const Solver = window.ShapeByShapeSolver;
  if (!Solver) throw new Error('The puzzle solver did not load.');

  const BOARD_SIZE = 6;
  const EMPTY = '□';
  const TILE_SYMBOLS = {
    empty: EMPTY,
    square: '■',
    'lower-left': '◣',
    'lower-right': '◢',
    'upper-right': '◥',
    'upper-left': '◤',
  };
  const SYMBOL_NAMES = {
    '□': 'empty',
    '■': 'square',
    '◣': 'lower-left triangle',
    '◢': 'lower-right triangle',
    '◥': 'upper-right triangle',
    '◤': 'upper-left triangle',
  };
  const SYMBOL_KEYS = Object.fromEntries(Object.entries(TILE_SYMBOLS).map(([key, symbol]) => [symbol, key]));
  const GAME_RED = '#e72d43';
  const GAME_YELLOW = '#ffdf4d';

  let board = Solver.EXAMPLE_BOARD.map(row => row.slice());
  let selectedSymbol = EMPTY;
  let generatedPuzzle = false;
  let latestSolutions = null;
  let busy = false;

  const $ = id => document.getElementById(id);
  const editorFrameHost = $('editor-board-frame');
  const editorBoardFrame = createBoardFrame('board-grid', 'Editable 6 by 6 puzzle board');
  editorFrameHost.replaceWith(editorBoardFrame.frame);
  const boardGrid = editorBoardFrame.grid;
  const editorStatus = $('editor-status');
  const solveButton = $('solve-puzzle');
  const generateButton = $('generate-puzzle');
  const solutionEmpty = $('solution-empty');
  const solutionContent = $('solution-content');
  const solutionFailure = $('solution-failure');
  const solutionStatusTag = $('solution-status-tag');

  function symbolLabel(symbol) {
    return SYMBOL_NAMES[symbol] || 'unknown tile';
  }

  function setEditorStatus(message, tone = '') {
    editorStatus.textContent = message;
    if (tone) editorStatus.dataset.tone = tone;
    else delete editorStatus.dataset.tone;
  }

  function setSelectedSymbol(symbol) {
    selectedSymbol = symbol;
    document.querySelectorAll('.palette-tool').forEach(button => {
      const selected = button.dataset.symbol === symbol;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function setupCanvas(canvas, width, height) {
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.imageSmoothingEnabled = true;
    return context;
  }

  function drawSymbol(context, symbol, x, y, size, color) {
    if (symbol === EMPTY) return;
    context.fillStyle = color;
    if (symbol === '■') {
      context.fillRect(x, y, size, size);
      return;
    }

    context.beginPath();
    switch (symbol) {
      case '◣': // Lower-left half.
        context.moveTo(x, y);
        context.lineTo(x, y + size);
        context.lineTo(x + size, y + size);
        break;
      case '◢': // Lower-right half.
        context.moveTo(x + size, y);
        context.lineTo(x, y + size);
        context.lineTo(x + size, y + size);
        break;
      case '◥': // Upper-right half.
        context.moveTo(x, y);
        context.lineTo(x + size, y);
        context.lineTo(x + size, y + size);
        break;
      case '◤': // Upper-left half.
        context.moveTo(x, y);
        context.lineTo(x + size, y);
        context.lineTo(x, y + size);
        break;
      default:
        return;
    }
    context.closePath();
    context.fill();
  }

  function drawGridLines(context, width, height, cellSize, color) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 1;
    context.beginPath();
    for (let i = 1; i < BOARD_SIZE; i++) {
      const offset = Math.round(i * cellSize) + 0.5;
      context.moveTo(offset, 0);
      context.lineTo(offset, height);
      context.moveTo(0, offset);
      context.lineTo(width, offset);
    }
    context.stroke();
    context.restore();
  }

  function drawEditorBoard() {
    const canvas = boardGrid.querySelector('.board-canvas');
    if (!canvas) return;
    const bounds = boardGrid.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const context = setupCanvas(canvas, bounds.width, bounds.height);
    const cellSize = bounds.width / BOARD_SIZE;
    context.fillStyle = GAME_YELLOW;
    context.fillRect(0, 0, bounds.width, bounds.height);

    board.forEach((row, y) => row.forEach((symbol, x) => {
      drawSymbol(context, symbol, x * cellSize, y * cellSize, cellSize, GAME_RED);
    }));
    drawGridLines(context, bounds.width, bounds.height, cellSize, 'rgba(80, 49, 31, .20)');
  }

  function drawPalettePreviews() {
    document.querySelectorAll('.tool-preview').forEach(canvas => {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width || 36;
      const height = bounds.height || 36;
      const context = setupCanvas(canvas, width, height);
      context.fillStyle = GAME_YELLOW;
      context.fillRect(0, 0, width, height);
      const inset = 1;
      drawSymbol(context, TILE_SYMBOLS[canvas.dataset.previewSymbol], inset, inset, Math.min(width, height) - inset * 2, GAME_RED);
    });
  }

  function renderBoard() {
    boardGrid.replaceChildren();
    const canvas = document.createElement('canvas');
    canvas.className = 'board-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    boardGrid.appendChild(canvas);

    board.forEach((row, y) => row.forEach((symbol, x) => {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'board-cell';
      cell.dataset.tile = SYMBOL_KEYS[symbol];
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Row ${y + 1}, column ${x + 1}: ${symbolLabel(symbol)}`);
      cell.title = `Row ${y + 1}, column ${x + 1} — ${symbolLabel(symbol)}`;
      cell.addEventListener('click', () => {
        if (busy) return;
        board[y][x] = selectedSymbol;
        generatedPuzzle = false;
        renderBoard();
        resetSolution('Board changed. Solve the puzzle to see the result.');
      });
      boardGrid.appendChild(cell);
    }));

    drawEditorBoard();
  }

  function resetSolution(statusMessage) {
    latestSolutions = null;
    solutionEmpty.hidden = false;
    solutionContent.hidden = true;
    solutionFailure.hidden = true;
    solutionStatusTag.textContent = 'Not solved';
    solutionStatusTag.className = 'solution-tag is-idle';
    if (statusMessage) setEditorStatus(statusMessage);
    solveButton.textContent = generatedPuzzle ? 'Reveal solution' : 'Solve puzzle';
  }

  function setBusy(value) {
    busy = value;
    solveButton.disabled = value;
    generateButton.disabled = value;
    $('load-example').disabled = value;
    $('clear-board').disabled = value;
    document.querySelectorAll('.palette-tool, .board-cell').forEach(button => { button.disabled = value; });
    solveButton.textContent = value ? 'Solving…' : (generatedPuzzle ? 'Reveal solution' : 'Solve puzzle');
  }

  function polygonForSymbol(symbol, x, y) {
    const polygons = {
      '■': [[0, 0], [1, 0], [1, 1], [0, 1]],
      '◣': [[0, 0], [0, 1], [1, 1]],
      '◢': [[1, 0], [0, 1], [1, 1]],
      '◥': [[0, 0], [1, 0], [1, 1]],
      '◤': [[0, 0], [1, 0], [0, 1]],
    };
    return (polygons[symbol] || []).map(([px, py]) => [x + px, y + py]);
  }

  function edgeKey(a, b) {
    const first = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? a : b;
    const second = first === a ? b : a;
    return `${first[0]},${first[1]}|${second[0]},${second[1]}`;
  }

  function addPieceBoundaryEdges(placement, edgeSet) {
    const pieceEdges = new Map();
    placement.shape.forEach((row, dy) => row.forEach((symbol, dx) => {
      if (symbol === EMPTY) return;
      const polygon = polygonForSymbol(symbol, placement.x + dx, placement.y + dy);
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        const key = edgeKey(a, b);
        const existing = pieceEdges.get(key);
        if (existing) existing.count++;
        else pieceEdges.set(key, { a, b, count: 1 });
      }
    }));

    // Shared edges between cells in one physical piece occur twice and vanish.
    // Only the outside edges of the whole piece remain to be drawn.
    for (const [key, edge] of pieceEdges) {
      if (edge.count === 1) edgeSet.set(key, edge);
    }
  }

  function drawCombinedSolution(canvas) {
    const grid = canvas.parentElement;
    const bounds = grid.getBoundingClientRect();
    const width = bounds.width || 360;
    const height = bounds.height || width;
    const context = setupCanvas(canvas, width, height);
    const cell = width / BOARD_SIZE;
    context.fillStyle = GAME_YELLOW;
    context.fillRect(0, 0, width, height);

    const layers = [
      { solution: latestSolutions.red, color: GAME_RED },
      { solution: latestSolutions.yellow, color: GAME_YELLOW },
    ];
    const boundaryEdges = new Map();

    for (const layer of layers) {
      if (!layer.solution) continue;
      for (const placement of layer.solution.placements) {
        placement.shape.forEach((row, dy) => row.forEach((symbol, dx) => {
          if (symbol === EMPTY) return;
          const x = placement.x + dx;
          const y = placement.y + dy;
          drawSymbol(context, symbol, x * cell, y * cell, cell, layer.color);
        }));
        addPieceBoundaryEdges(placement, boundaryEdges);
      }
    }

    // Deduplicate coincident edges shared by neighboring pieces, then draw only
    // genuine piece boundaries—never the borders of every individual cell.
    context.save();
    context.strokeStyle = '#38251f';
    context.lineWidth = Math.max(1.5, cell * 0.035);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.beginPath();
    for (const { a, b } of boundaryEdges.values()) {
      context.moveTo(a[0] * cell, a[1] * cell);
      context.lineTo(b[0] * cell, b[1] * cell);
    }
    context.stroke();
    context.restore();
  }

  function createBoardFrame(gridId, ariaLabel) {
    const frame = document.createElement('div');
    frame.className = 'board-frame';

    const corner = document.createElement('div');
    corner.className = 'axis-corner';
    corner.setAttribute('aria-hidden', 'true');

    const columns = document.createElement('div');
    columns.className = 'column-labels';
    columns.setAttribute('aria-hidden', 'true');
    for (let column = 1; column <= BOARD_SIZE; column++) {
      const label = document.createElement('span');
      label.textContent = String(column);
      columns.appendChild(label);
    }

    const rows = document.createElement('div');
    rows.className = 'row-labels';
    rows.setAttribute('aria-hidden', 'true');
    for (let row = 1; row <= BOARD_SIZE; row++) {
      const label = document.createElement('span');
      label.textContent = String(row);
      rows.appendChild(label);
    }

    const grid = document.createElement('div');
    grid.id = gridId;
    grid.className = 'board-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', ariaLabel);
    frame.append(corner, columns, rows, grid);
    return { frame, grid };
  }

  function renderCombinedSolution() {
    const result = $('solution-result');
    result.replaceChildren();
    const solutionBoardFrame = createBoardFrame('solution-board-grid', 'Combined red and yellow solution board');
    const canvas = document.createElement('canvas');
    canvas.className = 'board-canvas solution-board-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    solutionBoardFrame.grid.appendChild(canvas);
    result.appendChild(solutionBoardFrame.frame);
    drawCombinedSolution(canvas);

    const lists = document.createElement('div');
    lists.className = 'combined-piece-lists';
    for (const layer of [
      { name: 'Red', solution: latestSolutions.red, className: 'red-dot' },
      { name: 'Yellow', solution: latestSolutions.yellow, className: 'yellow-dot' },
    ]) {
      if (!layer.solution) continue;
      const section = document.createElement('section');
      section.className = 'combined-piece-group';
      const heading = document.createElement('h3');
      const dot = document.createElement('span');
      dot.className = `layer-dot ${layer.className}`;
      heading.append(dot, document.createTextNode(`${layer.name} pieces`));
      section.appendChild(heading);
      const list = document.createElement('ul');
      list.className = 'combined-piece-list';
      for (const placement of layer.solution.placements) {
        const item = document.createElement('li');
        item.textContent = `Piece ${placement.piece + 1} · Row ${placement.y + 1}, col ${placement.x + 1}`;
        list.appendChild(item);
      }
      section.appendChild(list);
      lists.appendChild(section);
    }
    result.appendChild(lists);
  }

  function solveCurrentPuzzle() {
    if (busy) return;
    setBusy(true);
    setEditorStatus('Checking placements for both color layers…');

    window.setTimeout(() => {
      try {
        latestSolutions = Solver.solveBoth(board);
        const redSolved = latestSolutions.red !== null;
        const yellowSolved = latestSolutions.yellow !== null;
        solutionEmpty.hidden = true;

        if (!redSolved && !yellowSolved) {
          solutionContent.hidden = true;
          solutionFailure.hidden = false;
          $('failure-copy').textContent = 'Neither layer has a solution for this board. Check the tiles and try again.';
          solutionStatusTag.textContent = 'No solution';
          solutionStatusTag.className = 'solution-tag is-failed';
          setEditorStatus('No solution found. Edit the board and try again.', 'error');
        } else {
          solutionFailure.hidden = true;
          solutionContent.hidden = false;
          $('solution-summary').replaceChildren();
          const addSummary = (label, count, colorClass, solved) => {
            const chip = document.createElement('div');
            chip.className = 'summary-chip';
            const dot = document.createElement('span');
            dot.className = `layer-dot ${colorClass}`;
            const copy = document.createElement('div');
            const strong = document.createElement('strong');
            strong.textContent = solved ? `${count} pieces` : 'No solution';
            const small = document.createElement('small');
            small.textContent = `${label} layer`;
            copy.append(strong, small);
            chip.append(dot, copy);
            $('solution-summary').appendChild(chip);
          };
          addSummary('Red', latestSolutions.red?.placements.length || 6, 'red-dot', redSolved);
          addSummary('Yellow', latestSolutions.yellow?.placements.length || 8, 'yellow-dot', yellowSolved);

          if (!redSolved || !yellowSolved) {
            solutionStatusTag.textContent = 'Partial solution';
            solutionStatusTag.className = 'solution-tag is-failed';
            setEditorStatus(`${redSolved ? 'Red' : 'Yellow'} layer solved; the other layer has no solution.`, 'error');
          } else {
            solutionStatusTag.textContent = 'Solved';
            solutionStatusTag.className = 'solution-tag is-solved';
            setEditorStatus(generatedPuzzle ? 'Solution revealed. Both layers have a verified solution.' : 'Both layers solved successfully.', 'success');
          }
          renderCombinedSolution();
        }
      } catch (error) {
        solutionEmpty.hidden = true;
        solutionContent.hidden = true;
        solutionFailure.hidden = true;
        if (error.name === 'SearchLimitError') {
          solutionFailure.hidden = false;
          $('failure-copy').textContent = 'This layout is unusually difficult to verify. No answer was confirmed before the search safety limit; try adjusting a few tiles and solving again.';
          solutionStatusTag.textContent = 'Could not verify';
          solutionStatusTag.className = 'solution-tag is-failed';
          setEditorStatus('Search limit reached before a solution could be confirmed. Try a slightly different layout.', 'error');
        } else {
          solutionEmpty.hidden = false;
          solutionStatusTag.textContent = 'Not solved';
          solutionStatusTag.className = 'solution-tag is-idle';
          setEditorStatus(error.message || 'Something went wrong while solving the board.', 'error');
        }
      } finally {
        setBusy(false);
      }
    }, 20);
  }

  document.querySelectorAll('.palette-tool').forEach(button => {
    button.addEventListener('click', () => setSelectedSymbol(TILE_SYMBOLS[button.dataset.symbol]));
  });

  $('clear-board').addEventListener('click', () => {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
    generatedPuzzle = false;
    setSelectedSymbol(EMPTY);
    renderBoard();
    resetSolution('Board cleared. Choose tiles from the palette to draw a puzzle.');
  });

  $('load-example').addEventListener('click', () => {
    board = Solver.EXAMPLE_BOARD.map(row => row.slice());
    generatedPuzzle = false;
    setSelectedSymbol(EMPTY);
    renderBoard();
    resetSolution('Example puzzle loaded. Edit any cell to make it your own.');
  });

  generateButton.addEventListener('click', () => {
    if (busy) return;
    setBusy(true);
    setEditorStatus('Creating a puzzle with a guaranteed solution…');
    window.setTimeout(() => {
      try {
        const generated = Solver.generatePuzzle({ attempts: 4, maxNodes: 40000 });
        board = generated.board.map(row => row.slice());
        generatedPuzzle = true;
        setSelectedSymbol(EMPTY);
        renderBoard();
        resetSolution('Puzzle ready. Press “Reveal solution” when you are ready.');
      } catch (error) {
        setEditorStatus(error.message || 'Could not generate a puzzle.', 'error');
      } finally {
        setBusy(false);
      }
    }, 20);
  });

  solveButton.addEventListener('click', solveCurrentPuzzle);

  window.addEventListener('resize', () => {
    drawPalettePreviews();
    drawEditorBoard();
    if (latestSolutions && !solutionContent.hidden) renderCombinedSolution();
  });

  setSelectedSymbol(EMPTY);
  drawPalettePreviews();
  renderBoard();
  resetSolution('Example puzzle loaded. Edit any cell to make it your own.');
})();
