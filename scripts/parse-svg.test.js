// SPDX-License-Identifier: MPL-2.0
const { describe, expect, it } = require('@jest/globals')
const { parseSvg } = require('./parse-svg.cjs')

describe('parseSvg', () => {
  it('parses valid SVG', () => {
    const doc = parseSvg('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>')
    expect(doc.documentElement.tagName).toBe('svg')
    expect(doc.getElementsByTagName('path')).toHaveLength(1)
  })

  it('rejects malformed SVG instead of accepting a repaired document', () => {
    expect(() => parseSvg('<svg><path></svg>')).toThrow()
    expect(() => parseSvg('<svg><path d=M0 /></svg>')).toThrow()
  })
})
