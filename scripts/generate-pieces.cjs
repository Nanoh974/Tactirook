// SPDX-License-Identifier: MPL-2.0
const fs = require('node:fs')
const path = require('node:path')
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom')

const root = path.join(__dirname, '..')
// Inline the upstream CSS and gradient inheritance for native SvgXml support.
function normalizeSvg(source, prefix) {
  const doc = new DOMParser({
    errorHandler: {
      warning: (message) => { throw new Error(message) },
      error: (message) => { throw new Error(message) },
      fatalError: (message) => { throw new Error(message) },
    },
  }).parseFromString(source, 'image/svg+xml')
  const rules = []
  for (const style of Array.from(doc.getElementsByTagName('style'))) {
    const css = style.textContent
    const pattern = /\.([\w-]+)\{([^{}]*)\}/g
    if (css.replace(pattern, '').trim()) throw new Error(`Unsupported SVG CSS in ${prefix}`)
    for (const [, name, declarations] of css.matchAll(pattern)) rules.push([name, declarations])
    style.parentNode.removeChild(style)
  }
  const declarations = (text) => text.split(';').filter(Boolean).map((declaration) => {
    const colon = declaration.indexOf(':')
    if (colon < 1) throw new Error(`Invalid SVG declaration in ${prefix}`)
    return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]
  })
  const elements = Array.from(doc.getElementsByTagName('*'))
  for (const element of elements) {
    const classes = element.getAttribute('class').split(/\s+/)
    for (const [name, text] of rules) {
      if (classes.includes(name)) {
        for (const [key, value] of declarations(text)) element.setAttribute(key, value)
      }
    }
    for (const [key, value] of declarations(element.getAttribute('style'))) {
      if (key !== 'color-scheme') element.setAttribute(key, value)
    }
    element.removeAttribute('style')
    element.removeAttribute('class')
  }
  const gradients = elements.filter((element) => element.tagName === 'linearGradient')
  for (const gradient of gradients) {
    const href = gradient.getAttribute('xlink:href') || gradient.getAttribute('href')
    if (!href) continue
    const parent = gradients.find((candidate) => `#${candidate.getAttribute('id')}` === href)
    if (!parent || parent.getAttribute('xlink:href') || parent.getAttribute('href')) {
      throw new Error(`Unsupported gradient inheritance in ${prefix}: ${href}`)
    }
    for (const attribute of Array.from(parent.attributes)) {
      if (attribute.name !== 'id' && !gradient.hasAttribute(attribute.name)) {
        gradient.setAttribute(attribute.name, attribute.value)
      }
    }
    if (!gradient.getElementsByTagName('stop').length) {
      for (const stop of Array.from(parent.getElementsByTagName('stop'))) {
        const clone = stop.cloneNode(true)
        clone.removeAttribute('id')
        gradient.appendChild(clone)
      }
    }
    gradient.removeAttribute('xlink:href')
    gradient.removeAttribute('href')
  }
  for (const element of elements) {
    if (element.hasAttribute('id')) element.setAttribute('id', `${prefix}-${element.getAttribute('id')}`)
    for (const attribute of Array.from(element.attributes)) {
      attribute.value = attribute.value.replace(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    }
  }
  return new XMLSerializer().serializeToString(doc)
}

const pieces = {}
const licenses = {}
for (const set of fs.readdirSync(path.join(root, 'assets', 'pieces')).filter((name) =>
  fs.statSync(path.join(root, 'assets', 'pieces', name)).isDirectory(),
).sort()) {
  pieces[set] = {}
  const directory = path.join(root, 'assets', 'pieces', set)
  licenses[set] = (set === 'chessnut' ? fs.readFileSync(path.join(directory, 'COPYRIGHT.txt'), 'utf8').trim() + '\n\n' : '')
    + fs.readFileSync(path.join(directory, 'LICENSE.txt'), 'utf8').trim()
  for (const color of ['b', 'w']) {
    pieces[set][color] = {}
    for (const piece of ['b', 'k', 'n', 'p', 'q', 'r']) {
      const file = path.join(directory, `${color}${piece.toUpperCase()}.svg`)
      pieces[set][color][piece] = normalizeSvg(fs.readFileSync(file, 'utf8').trim(), `${set}-${color}${piece}`)
    }
  }
}
fs.writeFileSync(
  path.join(root, 'src', 'pieceXml.ts'),
  `// SPDX-License-Identifier: MPL-2.0\n// Generated from assets/pieces by npm run generate:pieces.\n// Embedded artwork retains its separate licenses in pieceLicenseTexts.\n// Upstream artwork: CSS/gradient inheritance inlined and IDs prefixed; geometry unchanged.\nexport const pieceXml = ${JSON.stringify(pieces, null, 2)} as const\n\nexport const pieceLicenseTexts = ${JSON.stringify(licenses, null, 2)} as const\n`,
)
