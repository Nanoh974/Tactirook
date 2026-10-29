# Third-party notices and licensing scope

Tactirook's default project license is [GPL-3.0-or-later](./LICENSE), with
copyright/scope information in [NOTICE](./NOTICE). It does not replace the
separate licenses below or erase notices in dependencies.

## Original Tactirook work

The original application code, documentation, icon/logo, supplied piece PNGs,
Signature SVGs and Atelier SVGs are licensed under GPL-3.0-or-later.
The original piece sets also carry complete GPL notices in:

- [`assets/pieces/signature/LICENSE.txt`](./assets/pieces/signature/LICENSE.txt)
- [`assets/pieces/atelier/LICENSE.txt`](./assets/pieces/atelier/LICENSE.txt)

This project remains independently maintained; using its code does not imply
endorsement by Lichess, Expo, the font authors or the external piece artists.

## Expo starter

The original Expo MIT notice is preserved in
[`LICENSES/Expo-MIT.txt`](./LICENSES/Expo-MIT.txt):
Copyright (c) 2015-present 650 Industries, Inc. (aka Expo).
This notice continues to apply to the starter material.

## Puzzle data

- Source: [Lichess puzzle database](https://database.lichess.org/#puzzles).
- License: [CC0-1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- Snapshot and import metadata: [`src/puzzleManifest.json`](./src/puzzleManifest.json).

The bundled subset is credited to Lichess. It is not an official Lichess app.

## External chess artwork

| Set | Author | License | Notice |
| --- | --- | --- | --- |
| Celtic | Maurizio Monge | MIT | [Full text](./assets/pieces/celtic/LICENSE.txt) |
| Fantasy | Maurizio Monge | MIT | [Full text](./assets/pieces/fantasy/LICENSE.txt) |
| Spatial | Maurizio Monge | MIT | [Full text](./assets/pieces/spatial/LICENSE.txt) |
| Chessnut | Alexis Luengas | Apache-2.0 | [License](./assets/pieces/chessnut/LICENSE.txt), [copyright](./assets/pieces/chessnut/COPYRIGHT.txt) |

Original repositories:

- [Maurizio Monge's chess-art, revision d8705d8](https://github.com/maurimo/chess-art/tree/d8705d8bc9879fef44208de19e2a20c937409e1f).
- [Alexis Luengas's chessnut-pieces, revision 2b8eaf1](https://github.com/LexLuengas/chessnut-pieces/tree/2b8eaf14a31edad7e9deb53b1473e1d4857868a9).

The 48 ready-to-use SVGs were obtained from
[Lichess revision 898ad2c](https://github.com/lichess-org/lila/tree/898ad2cdee0aa803d7959d83868efc00097a648b/public/piece).
Its [COPYING.md](https://github.com/lichess-org/lila/blob/898ad2cdee0aa803d7959d83868efc00097a648b/COPYING.md)
records their authors and licenses. Source SVGs remain unchanged. The generated
runtime bundle only inlines CSS/gradient inheritance and prefixes IDs for
compatibility; geometry is unchanged.

### Historical artwork

Earlier versions/history included **Staunty by sadsnake1**, under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).
Those files are not included in the current app. Their original license still
applies to copies in earlier versions; this GPL change does not relicense them.

## Fonts

- **DM Sans**: DM Sans Project Authors, SIL OFL-1.1;
  [notice and full license](./assets/fonts/OFL-DMSans.txt).
- **DM Serif Display**: original Adobe/Google copyright and reserved-name
  notices, SIL OFL-1.1;
  [notice and full license](./assets/fonts/OFL-DMSerifDisplay.txt).

Font sources: [Google Fonts](https://github.com/google/fonts).
The font licenses apply to the fonts, not the application as a whole.

## Software dependencies and releases

Runtime dependencies include Expo/React/React Native and associated packages
(MIT), chess.js (BSD-2-Clause), fflate (MIT), AsyncStorage (MIT) and
react-native-svg (MIT). Exact versions and additional transitive dependency
license declarations are recorded in [`package-lock.json`](./package-lock.json).
Installed packages carry their own upstream notices; do not strip them.

This file is an asset/source attribution guide, not a claim that every
platform dependency has been legally audited. Before distributing native
releases, review the actual bundled dependency and platform notices, preserve
required texts and satisfy GPL source/distribution obligations. See the
[release checklist](./docs/DEVELOPMENT.md#before-a-mobile-store-release).
