# Shape by Shape Solver

A JavaScript solver for the [Shape by Shape](<https://www.amazon.com/dp/B00000IRZ4>) puzzle game by ThinkFun. Uses backtracking to find valid piece placements and displays the solutions in the terminal.

## Usage

1. Install the dependency:
   ```
   npm install chalk
   ```
2. Add your puzzle grid to `input.txt`, using spaces between symbols:
   ```
   □ ◢ ◣ □ □ □
   □ ◥ ■ □ □ □
   □ □ ■ □ □ ◢
   □ □ ■ ■ ■ ■
   □ □ ◥ ■ ◥ ◤
   □ □ ◢ ■ □ □
   ```
3. Run the solver:
   ```
   node index.js
   ```

## Features

- Solves red and yellow layers.
- Supports piece rotation and reflection.
- Validates placements and verifies solutions.
- Displays color-coded results in the terminal.

## Symbols

`□` Empty · `■` Full square · `◣ ◢ ◥ ◤` Triangles
