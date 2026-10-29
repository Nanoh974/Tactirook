import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { PNG } from 'pngjs'
import { pieceXml } from './pieceXml'

const sources = [
  ['k', 'kingW'], ['q', 'QueenW'], ['r', 'RookW'],
  ['b', 'BishopW'], ['n', 'KnightW'], ['p', 'PawnW'],
] as const
const darkPalette: Record<string, string> = {
  f6ebdd: '655c54', '33312e': '292522', d1c5b8: '49413a', faf8f4: 'a99b8c', c3b7aa: '3a332e',
}

test.each(sources)('Signature %s preserves every source pixel and only recolors the black piece', (piece, file) => {
  const source = PNG.sync.read(readFileSync(join(__dirname, '..', 'assets', `${file}.png`)))
  expect([source.width, source.height]).toEqual([32, 32])
  for (const color of ['w', 'b'] as const) {
    const xml = pieceXml.signature[color][piece]
    const document = new DOMParser().parseFromString(xml, 'image/svg+xml')
    expect(document.documentElement.getAttribute('viewBox')).toBe('0 0 32 32')
    expect(document.documentElement.getAttribute('shape-rendering')).toBe('crispEdges')
    expect(xml).not.toMatch(/<image\b|data:image|base64/)
    const actual = Buffer.alloc(32 * 32 * 4)
    const expected = Buffer.from(source.data)
    for (const element of Array.from(document.getElementsByTagName('path'))) {
      const fill = element.getAttribute('fill')
      if (!fill) throw new Error('Missing fill')
      const rgba = Buffer.from(`${fill.slice(1)}ff`, 'hex')
      const d = element.getAttribute('d') ?? ''
      const runs = /M(\d+) (\d+)h(\d+)v1H(\d+)z/g
      expect(d.replace(runs, '')).toBe('')
      for (const [, left, top, length, closingX] of d.matchAll(runs)) {
        expect(left).toBe(closingX)
        for (let x = Number(left); x < Number(left) + Number(length); x++) {
          expect(x).toBeLessThan(32)
          expect(Number(top)).toBeLessThan(32)
          rgba.copy(actual, (Number(top) * 32 + x) * 4)
        }
      }
    }
    if (color === 'b') {
      for (let offset = 0; offset < expected.length; offset += 4) {
        if (expected[offset + 3] === 0) continue
        const rgb = expected.subarray(offset, offset + 3).toString('hex')
        expect(darkPalette[rgb]).toBeDefined()
        Buffer.from(darkPalette[rgb], 'hex').copy(expected, offset)
      }
    }
    expect(actual.equals(expected)).toBe(true)
  }
})
