// SPDX-License-Identifier: MPL-2.0
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const codeLicense = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8')
if (!codeLicense.includes('Mozilla Public License Version 2.0') || !codeLicense.includes('Exhibit A')) {
  throw new Error('Expected the complete Mozilla Public License 2.0 in LICENSE')
}
const license = fs.readFileSync(path.join(root, 'LICENSES', 'CC-BY-4.0.txt'), 'utf8').trim()
if (!license.includes('Attribution 4.0 International') || !license.includes('Section 3')) {
  throw new Error('Expected the complete Creative Commons Attribution 4.0 license')
}
const notice = fs.readFileSync(path.join(root, 'assets', 'ORIGINAL_ARTWORK_LICENSE.txt'), 'utf8').trim()
if (!notice.includes('SPDX-License-Identifier: CC-BY-4.0')) {
  throw new Error('Expected the original artwork CC-BY-4.0 notice')
}
for (const set of ['signature', 'atelier']) {
  fs.writeFileSync(path.join(root, 'assets', 'pieces', set, 'LICENSE.txt'), `${notice.replace('../LICENSES/', '../../../LICENSES/')}\n\n${license}\n`)
}
