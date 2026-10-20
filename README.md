# Puzzle solver

A static browser app for the ThinkFun [Shape by Shape](https://www.amazon.com/dp/B00000IRZ4) puzzle. Draw a 6 × 6 board, solve both color layers, or generate a fully randomized puzzle whose red and yellow layers are both solvable. The solution stays hidden until requested.

## Run

Open `index.html` in a modern browser. No install or server is needed. To publish it, upload `index.html`, `styles.css`, `app.js`, and `solver.js` to any static host.

## Use

1. Choose a tile and click cells to draw the puzzle. Empty cells matter.
2. Click **Solve puzzle** to find both layers.
3. Click **Generate puzzle** for a solvable challenge, then **Reveal solution** when ready.

The combined solution view shows both colors at once, outlines only the edges between actual pieces, and includes row/column markers and piece starting coordinates.

## Tests

Run the optional solver tests with Node.js. They cover solving, randomized puzzle generation, and fast rejection of impossible all-red/all-yellow boards:

```sh
node tests/solver.test.js
```

The solver checks the total shape area before searching and uses a cell-constrained search with a safety limit to avoid locking up on pathological inputs.

## Puzzle rules

- Empty cells, full squares, and four triangle orientations are supported.
- Complementary triangles can combine to form a square.
- Pieces may rotate or reflect; each piece is used exactly once.

## Files

- `index.html` — page structure
- `styles.css` — responsive interface
- `app.js` — canvas rendering and interaction
- `solver.js` — puzzle rules, solver, and generator

## License

MIT. See `LICENSE`.
