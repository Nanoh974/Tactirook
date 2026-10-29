const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').trim()
if (!license.includes('GNU GENERAL PUBLIC LICENSE') || !license.includes('Version 3, 29 June 2007')) {
  throw new Error('Expected the complete GNU GPL version 3 in LICENSE')
}
const notice = `Copyright (C) 2026 Julien Sacrez (Solenia13) and Tactirook contributors

This artwork is part of Tactirook, licensed under the GNU General Public
License, version 3 or (at your option) any later version.
SPDX-License-Identifier: GPL-3.0-or-later

This artwork is distributed without any warranty. See the license below.

`
for (const set of ['signature', 'atelier']) {
  fs.writeFileSync(path.join(root, 'assets', 'pieces', set, 'LICENSE.txt'), `${notice}${license}\n`)
}
