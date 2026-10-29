# Privacy and data behavior

This document describes the current source, not a guarantee about future
releases or third-party forks. Tactirook's mobile store releases are still in
preparation; their final privacy declarations must be checked before publication.

## Data kept on your device

The app stores preferences and puzzle history using AsyncStorage (browser
storage on web, application storage on native platforms):

- Language, appearance, board palette/position and selected piece set.
- Selected themes, hidden puzzle information and automatic advance.
- Whether repeats are allowed and a compact record of seen puzzles.

There is currently no application account, cloud sync, advertising SDK,
analytics integration or gameplay-upload service in Tactirook's application code.
The app reads the device's language settings for its initial language choice.

Local storage is not a secure vault and should not be used for sensitive data.
Browser storage may be cleared or unavailable; native backup/restore behavior
depends on the operating system.

## Network requests

The web app downloads its JavaScript, fonts and puzzle shards from its hosting
site. Uncached puzzles require a connection. The hosting provider can process
ordinary request information such as IP addresses and browser headers under
its own policies.

Native release exports include the puzzle assets. Expo Go development sessions
load assets from the development server and may involve Expo's own services.
Tactirook does not query the Lichess API during play.

Opening source/credit links visits external services (including GitHub and
Lichess) with their own privacy policies. Development tooling and GitHub issue
reports are also separate from locally stored app preferences.

## Clearing data and reporting concerns

Use **Reset seen puzzles** to clear puzzle history; this does not reset other
preferences. Clear site storage on web to remove all local settings. On native
platforms, use the operating system's app-storage controls; uninstall/restore
behavior can depend on backups.

Do not include personal data in public bug reports. Report security/privacy
vulnerabilities through the [security policy](../SECURITY.md).
