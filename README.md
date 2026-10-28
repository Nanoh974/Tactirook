# ChessTrainer

A lightweight chess tactics trainer built with React, TypeScript, Vite, chess.js and SCSS modules.

## Run locally

```sh
npm install
npm run dev
```

Select any combination of mates in 1, mates in 2, mates in 3 and forks. Drag a piece or click a piece and its destination. A wrong move resets the position; the opponent plays the recorded response after a correct move. Solve the line to advance to the next puzzle.

The starter puzzles are bundled from the [Lichess puzzle database](https://database.lichess.org/#puzzles) (CC0), identified by their Lichess puzzle IDs. The included **Staunty** piece set is by **sadsnake1**, sourced from [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/staunty), licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Use of the included artwork must comply with those terms.

The bundled DM Sans and DM Serif Display fonts are from [Google Fonts](https://github.com/google/fonts) under the SIL Open Font License; their license texts are in `public/fonts/`.

The production build uses the `/ChessTrainer/` base path for GitHub Pages. Run `npm run build` and publish the contents of `dist/` to the `gh-pages` branch to update the hosted site.
