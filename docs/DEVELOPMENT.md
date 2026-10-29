# Development guide

## Requirements and running locally

Use Node.js 24 LTS (`.nvmrc`) and the committed npm lockfile:

```sh
npm ci
npm start
```

Run `npm run web`, `npm run ios` or `npm run android` for the relevant target.
Native emulators require their platform tools; iOS simulation requires macOS
and Xcode. Expo Go must support the SDK used by the project.

## Project layout

| Location | Purpose |
| --- | --- |
| `App.tsx` | Training screen and settings UI |
| `src/Board.tsx` | Board, input, promotion and piece animation |
| `src/useChessTrainer.tsx` | Puzzle play and feedback |
| `src/puzzleLibrary.ts` | Lazy shard loading and puzzle selection |
| `src/i18n/` | Translations and localization |
| `src/ThemeProvider.tsx`, `src/useTrainingSettings.ts` | Persistent preferences |
| `assets/pieces/`, `src/pieceXml.ts` | SVG artwork and generated runtime bundle |
| `assets/puzzles/` | Bundled compressed puzzle library |
| `scripts/` | Data import, verification and asset generation |

Storage keys retain the `chesstrainer.*` prefix to preserve existing user data.
Do not rename them without a tested migration. The initial language follows
the first supported device locale, with English as fallback; explicit choices
are saved.

## Artwork

The icon's original pixels live in `assets/icon.png`; `assets/icon.svg` is the
matching vector version and `assets/icon-app.png` is the 1024px native icon.

```sh
# Regenerate Atelier's original SVGs.
node scripts/draw-atelier-pieces.cjs

# Convert the six original piece PNGs into Signature and rebuild the bundle.
npm run vectorize:pieces

# Refresh GPL notices for original piece sets and rebuild the bundle.
npm run generate:licenses

# Rebuild the runtime bundle after editing any SVG or piece license.
npm run generate:pieces
```

Signature preserves the supplied 32x32 pixel art as vector paths, not embedded
PNGs. Its white palette and transparency are unchanged; black pieces recolor
the same geometry. The vectorizer rejects unsupported dimensions, partial
transparency and unmapped colors rather than silently changing the artwork.

Commit source artwork, generated SVGs and `src/pieceXml.ts` together.
Third-party source SVGs stay unchanged; the bundler inlines CSS/gradient
inheritance and prefixes IDs for React Native/web compatibility.
Preserve the licenses described in [third-party notices](../THIRD_PARTY_NOTICES.md).

## Validation and deployment

Run typecheck, lint and tests before exporting:

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform all --output-dir dist
```

CI checks generated artwork for drift and validates the web export.
Only a successful `main` run deploys to GitHub Pages through the
`github-pages` environment. In repository Settings > Pages, the source must
be **GitHub Actions**. The project path is `/ChessTrainer`; changing the repo
name or hosting path requires updating Expo's `experiments.baseUrl`.

The full puzzle verifier is deliberately a separate manual workflow because
it replays the entire database. Run it when changing puzzle data or import logic.

## Before a mobile store release

The native apps are not published yet. Before release:

- Choose final app identifiers and set up signing without committing credentials.
- Build and test on real iOS/Android devices, including offline asset loading,
  saved preferences, large text, reduced motion, VoiceOver and TalkBack.
- Review dependency/platform licenses and include required notices and source
  offers/links in distributed builds; a source-repository notice alone is not a
  complete native release compliance process.
- Recheck actual data/network behavior and complete each store's privacy forms.
- Prepare screenshots, support/privacy URLs, store descriptions and review builds.
- Verify GPL compliance for the intended distribution channel; if store terms
  conflict with GPL obligations, resolve the licensing/distribution plan first.
- Tag a tested release, publish release notes and add only genuine store links.

No signing configuration, store approval or release date is implied by a
successful JavaScript export.
