# Puzzle library

The app includes **443,224 distinct puzzles** from the official
[Lichess database](https://database.lichess.org/#puzzles), under CC0-1.0.
The source snapshot contains 6,157,341 puzzles. Its SHA-256, source counts,
imported counts and initial fixture are recorded in
[`src/puzzleManifest.json`](../src/puzzleManifest.json).

## Coverage and selection

All 73 public Lichess themes are available. Multiple selected themes match
**any** selected theme, not all of them. A puzzle can have multiple tags but is
stored once. Named openings in CSV `OpeningTags` are not puzzle themes.

The pack targets 10,000 puzzles per theme, or the entire source inventory where
smaller (for example 1,133 underpromotions, 2,502 castling puzzles and 6,243
mates in five or more). Overlapping tags can produce larger theme totals.
The importer retains qualifying records in source order; the result is not a
curated or statistically random sample.

The first puzzle is random. The app prefers unseen puzzles until a selection's
eligible pool is exhausted, unless repeats are explicitly allowed. Seen history
is tied to the library snapshot and resets when the library identity changes.

## Storage and loading

The approximately 30 MiB pack in [`assets/puzzles/`](../assets/puzzles/) uses
gzip-compressed JSON with a `.puzzles` extension, 500 puzzles per shard and a
theme index. Metro treats these as assets, not JavaScript modules.

Only needed shards are read; at most four decoded shards are cached. The theme
index loads on demand. On the web, an uncached shard needs a connection to the
deployment host. Native release exports include the assets; Expo Go development
loads them from Metro. Errors surface with a retry action.

Promotion offers all four legal pieces. Any legal mate is accepted in mate-in-one
puzzles, following the Lichess puzzle convention.

## Import or expand

The source is Lichess's CSV compressed with Zstandard. The importer streams it
without retaining the entire source database in memory.

With Node.js 24:

```sh
# Downloads into ignored .cache/puzzles/.
npm run import:puzzles

# Reuse a local CSV / CSV.zst and change the coverage target.
npm run import:puzzles -- --input /path/to/lichess_db_puzzle.csv.zst --per-theme 20000

# Replay every imported solution and verify coverage/indexes.
npm run verify:puzzles
```

Commit regenerated assets, `src/puzzleAssets.ts` and `src/puzzleManifest.json`
together. Never commit the original downloaded database or `.cache/`.
A new source theme must be added explicitly to `src/puzzleThemes.ts`.

The full verifier checks unique IDs, every FEN/UCI solution, index membership,
counts and at least `min(target, source inventory)` puzzles for every theme.
It can also be launched from the repository's **Verify full puzzle library**
manual GitHub Actions workflow.
