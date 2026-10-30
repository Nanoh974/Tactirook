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

## Local Xcode project

Keep the generated native project in `ios/` at the repository root, not in a
temporary session directory. With Node.js 24 active and CocoaPods installed:

```sh
npx expo prebuild --platform ios --no-install
cd ios
pod install
open Tactirook.xcworkspace
```

The generated `ios/` and `android/` directories are already ignored by Git.
Keep reproducible native configuration in the Expo config and config plugins;
local changes in Xcode, including signing settings, are not versioned. Avoid
`prebuild --clean` unless you intend to regenerate the native project and have
preserved any local settings you need. After relocating an existing native
project, rerun `pod install` from `ios/` to refresh dependency paths.

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

# Refresh CC BY 4.0 notices for original piece sets and rebuild the bundle.
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
Original artwork uses CC-BY-4.0; generator code uses MPL-2.0. Embedded artwork
and data retain their separate licenses even when bundled in a source file.

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
be **GitHub Actions**. CI sets `TACTIROOK_WEB_BASE_URL=/Tactirook` for the
web export; changing the repo name or hosting path requires updating that value.
To reproduce the hosted export locally:

```sh
TACTIROOK_WEB_BASE_URL=/Tactirook npx expo export --platform web
```

Leave this variable unset for native builds and multi-platform exports.
The default base path is empty: applying the web hosting prefix to a native
Release build can cause asset paths to collide with the app executable.

The full puzzle verifier is deliberately a separate manual workflow because
it replays the entire database. Run it when changing puzzle data or import logic.

## iOS TestFlight builds

`.github/workflows/ios-testflight.yml` builds, signs and uploads the iOS app
to TestFlight when a `v*` tag is pushed. The tag must match `expo.version` in
`app.json` (for example `v1.0.0`); the build number is the workflow run number.
App Store submission stays manual in App Store Connect.

The job uses the `testflight` environment, restricted to `v*` tags, with these
secrets: `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`,
`BUILD_PROVISION_PROFILE_BASE64` (App Store profile named `Tactirook AppStore`),
`KEYCHAIN_PASSWORD`, `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID` and
`ASC_KEY_P8_BASE64`. Never commit these files or values. The distribution
certificate and profile expire yearly; renew them and update the secrets.

```sh
npm run release:ios            # 1.0.0 → 1.0.1
npm run release:ios -- minor   # 1.0.0 → 1.1.0 (also: major, or an explicit X.Y.Z)
npm run release:ios -- --dry-run
```

The script must start from an up-to-date, clean `main` and needs the GitHub CLI
(`gh auth login`). It bumps `app.json`/`package.json`, opens a `release/vX.Y.Z`
PR, waits for the required checks, merges it, tags the merge commit and follows
the TestFlight run. To tag by hand instead:

```sh
git tag v1.0.0 && git push origin v1.0.0
```

## Before a mobile store release

The native apps are not published yet. Before release:

- The iOS bundle identifier is `io.github.nanoh974.tactirook`; choose the
  Android identifier and set up signing without committing credentials.
- Build and test on real iOS/Android devices, including offline asset loading,
  saved preferences, large text, reduced motion, VoiceOver and TalkBack.
- Review dependency/platform licenses and include required notices and source
  offers/links in distributed builds; a source-repository notice alone is not a
  complete native release compliance process.
- Recheck actual data/network behavior and complete each store's privacy forms.
- Prepare screenshots, support/privacy URLs, store descriptions and review builds.
- Make the source of MPL-covered files in the exact shipped version available
  under MPL-2.0, including modifications, and tell users where to obtain it.
  Keep the source/license link working in each distributed build.
- Include CC BY 4.0 attribution and license information for original artwork,
  and identify modifications. Make unprotected artwork available when relying
  on the maintainer's additional app-store permission. Check store/DRM terms
  against all third-party licenses; this permission does not cover them.
- Tag a tested release, publish release notes and add only genuine store links.

No signing configuration, store approval or release date is implied by a
successful JavaScript export.
