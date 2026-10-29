// SPDX-License-Identifier: MPL-2.0
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import { pieceLicenseTexts, pieceXml } from './pieceXml'
import { isPieceSet, isSavedPieceSet, pieceSetNames, pieceSets } from './pieceSets'

test('keeps the code license separate from the original artwork license', () => {
  const root = join(__dirname, '..')
  expect(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).license).toBe('MPL-2.0')
  expect(JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8')).packages[''].license).toBe('MPL-2.0')
  expect(readFileSync(join(root, 'LICENSE'), 'utf8')).toContain('Mozilla Public License Version 2.0')
  const notice = readFileSync(join(root, 'assets', 'ORIGINAL_ARTWORK_LICENSE.txt'), 'utf8')
  expect(notice).toContain('SPDX-License-Identifier: CC-BY-4.0')
  expect(notice).toContain('Earlier GPL grants remain valid')
  for (const set of ['signature', 'atelier'] as const) {
    expect(pieceLicenseTexts[set]).toContain(notice.replace('../LICENSES/', '../../../LICENSES/').trim())
  }
})

test('bundles exactly the available piece sets and their license notices', () => {
  expect(Object.keys(pieceXml).sort()).toEqual([...pieceSetNames].sort())
  expect(Object.keys(pieceLicenseTexts).sort()).toEqual([...pieceSetNames].sort())
  expect(isPieceSet('classic')).toBe(false)
  expect(isPieceSet('sculpted')).toBe(false)
  expect(isSavedPieceSet('classic')).toBe(true)
  expect(isSavedPieceSet('sculpted')).toBe(true)
  expect(isSavedPieceSet('unknown')).toBe(false)
})

test.each(['signature', 'atelier'] as const)('%s displays the original artwork attribution grant', (set) => {
  expect(pieceSets[set].license).toBe('CC-BY-4.0')
  expect(pieceLicenseTexts[set]).toContain('Attribution 4.0 International')
  expect(pieceLicenseTexts[set]).toContain('Suggested attribution:')
  expect(pieceLicenseTexts[set]).toContain('additional permission')
  expect(pieceLicenseTexts[set]).toContain('Solenia13')
  expect(pieceLicenseTexts[set]).toContain('Nanoh974')
  expect(pieceLicenseTexts[set]).toContain(readFileSync(join(__dirname, '..', 'LICENSES', 'CC-BY-4.0.txt'), 'utf8').trim())
  expect(pieceLicenseTexts[set]).not.toContain('GNU GENERAL PUBLIC LICENSE')
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
    set === 'signature' || set === 'atelier' ? 'Attribution 4.0 International' : set === 'chessnut' ? 'Apache License' : 'MIT License',
  )
})
