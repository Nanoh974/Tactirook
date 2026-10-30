// SPDX-License-Identifier: MPL-2.0
const { DOMParser } = require('@xmldom/xmldom')

function parseSvg(source) {
  return new DOMParser({
    onError: (level, message) => { throw new Error(`${level}: ${message}`) },
  }).parseFromString(source, 'image/svg+xml')
}

module.exports = { parseSvg }
