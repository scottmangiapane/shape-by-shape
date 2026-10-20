# Shape by Shape Solver

A static browser-based solver for [ThinkFun’s](https://www.thinkfun.com/) Shape by Shape spatial puzzle. Draw the red and yellow shapes from a puzzle, solve both layers, or generate a randomized challenge with a verified solution that stays hidden until revealed.

**Play online:** https://scottmangiapane.github.io/shape-by-shape-solver/  
**Source code:** https://github.com/scottmangiapane/shape-by-shape-solver

## How to play

1. Choose a tile shape and click cells to draw the puzzle. Empty cells matter.
2. Select **Solve puzzle** to find the red and yellow piece placements.
3. Select **Generate puzzle** for a new solvable challenge, then reveal the solution when you’re ready.

The combined solution view shows both colors at once, outlines only actual piece boundaries, and includes row/column markers and piece starting coordinates.

## Run locally

Open `index.html` in a modern browser. No install, build step, or server is required. To host the app, publish `index.html`, `styles.css`, `app.js`, and `solver.js` to any static host. The live site is hosted with GitHub Pages.

## Tests

The optional solver tests require Node.js:

```sh
node tests/solver.test.js
```

They cover solving, randomized puzzle generation, and fast rejection of impossible all-red/all-yellow boards. The solver checks total shape area before searching and uses a cell-constrained search with a safety limit to avoid locking up on pathological inputs.

## Puzzle rules

- Empty cells, full squares, and four triangle orientations are supported.
- Complementary triangles can combine to form a square.
- Pieces may rotate or reflect; each piece is used exactly once.

## Project files

- `index.html` — page structure and project introduction
- `styles.css` — responsive interface
- `app.js` — canvas rendering and interaction
- `solver.js` — puzzle rules, solver, and generator
- `tests/solver.test.js` — solver and generator tests

## License

MIT. See `LICENSE`.
