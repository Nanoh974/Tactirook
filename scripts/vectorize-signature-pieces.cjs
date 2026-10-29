// SPDX-License-Identifier: MPL-2.0
const fs = require('node:fs')
const path = require('node:path')
const { PNG } = require('pngjs')

const root = path.join(__dirname, '..', 'assets')
const output = path.join(root, 'pieces', 'signature')
const sources = { K: 'kingW', Q: 'QueenW', R: 'RookW', B: 'BishopW', N: 'KnightW', P: 'PawnW' }
const darkPalette = {
  f6ebdd: '655c54',
  '33312e': '292522',
  d1c5b8: '49413a',
  faf8f4: 'a99b8c',
  c3b7aa: '3a332e',
}

fs.mkdirSync(output, { recursive: true })
for (const [piece, source] of Object.entries(sources)) {
  const png = PNG.sync.read(fs.readFileSync(path.join(root, `${source}.png`)))
  if (png.width !== 32 || png.height !== 32) throw new Error(`Expected a 32x32 source: ${source}`)
  const paths = new Map()
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width;) {
      const offset = (y * png.width + x) * 4
      const rgba = png.data.subarray(offset, offset + 4).toString('hex')
      const alpha = png.data[offset + 3]
      if (alpha !== 0 && alpha !== 255) throw new Error(`Expected binary transparency in ${source}`)
      let end = x + 1
      while (end < png.width) {
        const next = (y * png.width + end) * 4
        if (png.data.subarray(next, next + 4).toString('hex') !== rgba) break
        end++
      }
      if (alpha !== 0) {
        const color = rgba.slice(0, 6)
        if (!darkPalette[color]) throw new Error(`Unmapped source color #${color} in ${source}`)
        paths.set(color, `${paths.get(color) || ''}M${x} ${y}h${end - x}v1H${x}z`)
      }
      x = end
    }
  }
  for (const color of ['w', 'b']) {
    const elements = [...paths].map(([fill, d]) =>
      `  <path fill="#${color === 'w' ? fill : darkPalette[fill]}" d="${d}"/>`,
    ).join('\n')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">\n${elements}\n</svg>\n`
    fs.writeFileSync(path.join(output, `${color}${piece}.svg`), svg)
  }
}
