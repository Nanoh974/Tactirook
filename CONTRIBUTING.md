# Contributing to Tactirook

Thanks for helping make chess practice more approachable. Tactirook is a small,
maintainer-led project; thoughtful bug reports and accessibility feedback are
just as useful as code.

## Before starting

- Follow the [code of conduct](./CODE_OF_CONDUCT.md).
- Search existing issues and pull requests.
- Use an issue to discuss substantial UX, architecture or dependency changes.
- Report vulnerabilities through [SECURITY.md](./SECURITY.md), not a public issue.

For bugs, include the app version or commit, operating system, browser/device,
reproduction steps and expected/actual behavior. Redact personal information
from screenshots and logs.

## Local workflow

1. Fork the repository and create a focused branch.
2. Use Node.js 24 and run `npm ci`.
3. Make the smallest complete change, with relevant tests and documentation.
4. Run:

   ```sh
   npm run typecheck
   npm run lint
   npm test
   npx expo export --platform all
   ```

5. Test the affected experience manually. A web export does not establish that
   a change works with VoiceOver, TalkBack or a physical mobile device.
6. Open a pull request against `main`, describing the problem, solution and checks.

Do not commit `node_modules/`, `.expo/`, `dist/`, credentials, signing files,
private logs or downloaded database archives. Use the existing package lockfile
and avoid unrelated dependency updates.

## Areas where help is welcome

- **Translations:** edit the language files in [`src/i18n/`](./src/i18n/).
  English defines the message keys. Keep keys consistent in all seven languages,
  and preserve interpolation placeholders.
- **Accessibility:** test keyboard interaction, focus, reduced motion, large
  text and screen readers. Describe the device and assistive technology used.
- **Tests and fixes:** add a regression test when practical; preserve tap,
  drag, promotion, animation and saved-settings behavior.
- **Artwork:** provide the author, source, permission/license and notices.
  Do not assume publicly downloadable graphics can be redistributed or relicensed.
  See [artwork generation](./docs/DEVELOPMENT.md#artwork).
- **Puzzle data:** follow the [library guide](./docs/PUZZLE_LIBRARY.md).
  Regenerate the manifest, indexes and assets together, and run the full verifier.

Expo, React and React Native versions are coupled. Use Expo's compatibility
guidance for upgrades rather than independently bumping every package.

## Review and project direction

The maintainer, [Nanoh974](https://github.com/Nanoh974), handles project
direction, reviews and official releases. A contribution does not guarantee
acceptance; discuss major changes first to avoid wasted work.

Keep pull requests focused and explain behavior changes. For UI work, include
before/after screenshots and note the platforms actually tested. Maintainers
may ask for changes before merging.

## Licensing contributions

You retain copyright to your contributions. Unless explicitly documented
otherwise, code and documentation contributions are submitted under
[MPL-2.0](./LICENSE), and original artwork contributions under
[CC-BY-4.0](./LICENSES/CC-BY-4.0.txt). No copyright assignment or separate CLA
is currently required. For artwork intended for store builds, explicitly
confirm permission for any store-required technical protections as described
in the [artwork notice](./assets/ORIGINAL_ARTWORK_LICENSE.txt); the maintainer's
additional permission cannot be granted on behalf of other contributors.

Only submit work you have the right to contribute. Preserve third-party license
notices and document exceptions in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
The project licenses do not erase an imported asset's existing license.
