# ChessTrainer - React Native / Expo

ChessTrainer is an iOS, Android and web app built with React Native and Expo.
It includes puzzles, category filters, move hints, tap and drag controls,
opponent replies, restart and next-puzzle actions. The training menu contains
category filters, options to hide the current puzzle type or rating, and an
optional automatic advance 0.5 seconds after solving a puzzle. These settings
apply for the current session and automatic advance is off by default. Hiding
the type also hides the move count so that it does not give away the length
of the puzzle.
On mobile, the board and puzzle controls fit on one screen; the board shrinks
when necessary on short screens, and credits remain available in the menu.

## Run

Use Node.js 24 LTS (see `.nvmrc`), then from this directory:

```sh
npm ci
npm start
```

Open the QR code with Expo Go on a device on the same network, or use `npm run
ios`, `npm run android`, or `npm run web`. An iOS simulator requires Xcode and
its license agreement; an Android emulator requires the Android SDK and an
emulator. Building native apps also requires the corresponding platform tools.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run verify:puzzles
npx expo export --platform all
```

The JavaScript bundles and web version do not replace testing on physical
devices or native simulators.

For GitHub Pages, export the web app with `npx expo export --platform web` and
publish the contents of `dist/` to the `gh-pages` branch. The configured
`/ChessTrainer` base path matches the repository's Pages URL.

## Puzzle library

The app includes **443,224 distinct puzzles** from the official
[Lichess CSV database](https://database.lichess.org/#puzzles), under
[CC0](https://creativecommons.org/publicdomain/zero/1.0/). The source snapshot
contains 6,157,341 puzzles. Its SHA-256, source counts and imported counts are
recorded in [the manifest](./src/puzzleManifest.json).

All **73 public Lichess themes** are available as compact, searchable filters,
grouped like [Lichess's theme browser](https://lichess.org/training/themes).
Groups can be expanded independently; only Checkmates is open by default.
Searching automatically opens groups with matching themes. Collapsing a group
does not change its selected themes.
"All / mixed" selects all themes. Multiple selections match **any** of those
themes, not all of them. A puzzle may have several themes and is stored only
once. Named chess openings from the CSV's `OpeningTags` column are not puzzle
themes; the `opening` theme is included.

The pack targets **10,000 puzzles per theme**, or the entire source inventory
when fewer exist (for example 1,133 underpromotions, 2,502 castling puzzles,
and 6,243 mates in five or more). Overlapping tags mean some themes contain
more than 10,000 puzzles. It retains the first qualifying records in source
order (random-looking puzzle IDs, not Elo order); it is not a curated or
statistically random sample.

### Storage and loading

The approximately **30 MiB** pack is in `assets/puzzles/`: gzip-compressed
JSON files with a `.puzzles` extension, 500 puzzles per shard, plus a theme
index. Metro registers these as assets rather than JavaScript modules.
Only the selected shard is read; at most four decoded shards are cached.
The theme index is loaded on demand when filtering. The initial puzzle is
small enough to be in the manifest, so startup does not fetch the whole pack.
Puzzle order is shuffled without replacement until a selection's pool is
exhausted; changing themes starts a new pool.

The same files work on iOS, Android and static web hosting, including GitHub
Pages. Native release bundles include the assets; Expo Go downloads needed
assets from Metro. The web version fetches them from its own deployment, so
an uncached puzzle requires a connection. Loading failures are shown with a
retry action. No Lichess API request or backend is needed during play.
Promotion offers queen, rook, bishop and knight; any legal mate is accepted
for mate-in-one puzzles, as specified by Lichess.

### Import or expand

The community-standard **source** is Lichess's CSV compressed with Zstandard
(`lichess_db_puzzle.csv.zst`), with FEN positions, UCI moves, ratings and
multiple theme tags. The importer streams the full source without loading
the six-million-puzzle database into memory.

With Node 24:

```sh
# Downloads the official source into the ignored .cache/puzzles/ directory.
npm run import:puzzles

# Reuse a downloaded .csv or .csv.zst and change the coverage target.
npm run import:puzzles -- --input /path/to/lichess_db_puzzle.csv.zst --per-theme 20000

# Replay every imported solution and check all indexes and coverage targets.
npm run verify:puzzles
```

Commit regenerated assets, `src/puzzleAssets.ts` and `src/puzzleManifest.json`
together. Do not commit the original download or `.cache/`. An import fails
explicitly if a new source theme needs adding to `src/puzzleThemes.ts`.
The verifier checks unique IDs, every FEN and UCI move, index membership,
and at least `min(target, source inventory)` puzzles for every theme.

## Resources

Puzzles are from the [Lichess puzzle database](https://database.lichess.org/#puzzles)
(CC0). The **Staunty** pieces by **sadsnake1**, including the knight used in
the app icon, are from [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece/staunty)
and licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
Use of the artwork and derived icon must comply with those terms.

DM Sans and DM Serif Display are from [Google Fonts](https://github.com/google/fonts)
under the SIL Open Font License; the license texts are in `assets/fonts/`.
The SVG files in `assets/pieces/` are bundled into `src/pieceXml.ts`; after
changing them, regenerate that file with `npm run generate:pieces`. The icon
SVG can be regenerated with `node scripts/generate-icon.cjs`; its PNG must
then be regenerated at 1024 × 1024 pixels.
