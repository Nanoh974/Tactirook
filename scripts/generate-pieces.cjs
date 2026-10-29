const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const pieces = {}
for (const color of ['b', 'w']) {
  pieces[color] = {}
  for (const piece of ['b', 'k', 'n', 'p', 'q', 'r']) {
    const file = path.join(root, 'assets', 'pieces', `${color}${piece.toUpperCase()}.svg`)
    pieces[color][piece] = fs.readFileSync(file, 'utf8').replace(' style="color-scheme:light only"', '').trim()
  }
}
fs.writeFileSync(
  path.join(root, 'src', 'pieceXml.ts'),
  `// Generated from assets/pieces by npm run generate:pieces.\nexport const pieceXml = ${JSON.stringify(pieces, null, 2)} as const\n`,
)
