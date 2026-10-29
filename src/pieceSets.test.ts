import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { pieceLicenseTexts, pieceXml } from './pieceXml'
import { isPieceSet, isSavedPieceSet, pieceSetNames, pieceSets } from './pieceSets'

test('bundles exactly the available piece sets and their license notices', () => {
  expect(Object.keys(pieceXml).sort()).toEqual([...pieceSetNames].sort())
  expect(Object.keys(pieceLicenseTexts).sort()).toEqual([...pieceSetNames].sort())
  expect(isPieceSet('classic')).toBe(false)
  expect(isPieceSet('sculpted')).toBe(false)
  expect(isSavedPieceSet('classic')).toBe(true)
  expect(isSavedPieceSet('sculpted')).toBe(true)
  expect(isSavedPieceSet('unknown')).toBe(false)
})

test.each(['signature', 'atelier'] as const)('%s displays the original artwork GPL grant', (set) => {
  expect(pieceSets[set].license).toBe('GPL-3.0-or-later')
  expect(pieceLicenseTexts[set]).toContain('version 3 or (at your option) any later version')
  expect(pieceLicenseTexts[set]).toContain('Solenia13')
  expect(pieceLicenseTexts[set]).not.toContain('All rights reserved.')
})

test.each(pieceSetNames)('%s preserves all twelve source drawings and resolves native SVG styling', (set) => {
  const parser = new DOMParser()
  const shapes = (document: Document) => Array.from(document.getElementsByTagName('*'))
    .filter((element) => ['path', 'ellipse', 'circle'].includes(element.tagName))
    .map((element) => ['d', 'cx', 'cy', 'rx', 'ry', 'r', 'transform'].map((attribute) => element.getAttribute(attribute)))
  for (const color of ['w', 'b'] as const) {
    expect(Object.keys(pieceXml[set][color]).sort()).toEqual(['b', 'k', 'n', 'p', 'q', 'r'])
    for (const piece of ['k', 'q', 'r', 'b', 'n', 'p'] as const) {
      const source = readFileSync(join(__dirname, '..', 'assets', 'pieces', set, `${color}${piece.toUpperCase()}.svg`), 'utf8')
      const xml = pieceXml[set][color][piece]
      const original = parser.parseFromString(source, 'image/svg+xml')
      const normalized = parser.parseFromString(xml, 'image/svg+xml')
      expect(shapes(normalized)).toEqual(shapes(original))
      expect(normalized.documentElement.getAttribute('viewBox')).toBe(original.documentElement.getAttribute('viewBox'))
      expect(xml).not.toMatch(/<(?:style|script|image)\b|\s(?:class|style|(?:xlink:)?href)=/)
      const elements = Array.from(normalized.getElementsByTagName('*'))
      const ids = elements.filter((element) => element.hasAttribute('id')).map((element) => element.getAttribute('id'))
      expect(new Set(ids).size).toBe(ids.length)
      for (const [, id] of xml.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(id)
      for (const gradient of Array.from(normalized.getElementsByTagName('linearGradient'))) {
        expect(gradient.getElementsByTagName('stop').length).toBeGreaterThanOrEqual(2)
      }
      const originalPaths = Array.from(original.getElementsByTagName('path'))
      const normalizedPaths = Array.from(normalized.getElementsByTagName('path'))
      for (const [index, originalPath] of originalPaths.entries()) {
        const classes = (originalPath.getAttribute('class') ?? '').split(/\s+/)
        if (classes.includes('stroke-color')) expect(normalizedPaths[index].getAttribute('stroke')).toBe('#000')
        if (classes.includes('base')) expect(normalizedPaths[index].getAttribute('stroke-linejoin')).toBe('round')
      }
    }
  }
  expect(pieceLicenseTexts[set]).toContain(pieceSets[set].author)
  expect(pieceLicenseTexts[set]).toContain(
    set === 'signature' || set === 'atelier' ? 'GNU GENERAL PUBLIC LICENSE' : set === 'chessnut' ? 'Apache License' : 'MIT License',
  )
})
