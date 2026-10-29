// SPDX-License-Identifier: MPL-2.0
export const boardPalettes = {
  brown: { light: '#f2dfbd', dark: '#ae7957', coordinate: '#21140c' },
  blue: { light: '#dbe8f3', dark: '#7999b3', coordinate: '#101d24' },
  green: { light: '#c4cdb5', dark: '#778d76', coordinate: '#0c1a0e' },
} as const

export type BoardPalette = keyof typeof boardPalettes
export const boardPaletteNames = ['brown', 'blue', 'green'] as const satisfies readonly BoardPalette[]
export const isBoardPalette = (value: string): value is BoardPalette => boardPaletteNames.some((name) => name === value)
