// SPDX-License-Identifier: MPL-2.0
export const pieceSetNames = ['signature', 'atelier', 'celtic', 'chessnut', 'fantasy', 'spatial'] as const
export type PieceSet = typeof pieceSetNames[number]
export const defaultPieceSet: PieceSet = 'atelier'
export const pieceSets = {
  signature: { name: 'Signature', author: 'Nanoh974', license: 'CC-BY-4.0', url: 'https://github.com/Nanoh974/Tactirook' },
  atelier: { name: 'Atelier', author: 'Tactirook', license: 'CC-BY-4.0', url: 'https://github.com/Nanoh974/Tactirook' },
  celtic: { name: 'Celtic', author: 'Maurizio Monge', license: 'MIT', url: 'https://github.com/maurimo/chess-art' },
  chessnut: { name: 'Chessnut', author: 'Alexis Luengas', license: 'Apache 2.0', url: 'https://github.com/LexLuengas/chessnut-pieces' },
  fantasy: { name: 'Fantasy', author: 'Maurizio Monge', license: 'MIT', url: 'https://github.com/maurimo/chess-art' },
  spatial: { name: 'Spatial', author: 'Maurizio Monge', license: 'MIT', url: 'https://github.com/maurimo/chess-art' },
} satisfies Record<PieceSet, { name: string; author: string; license: string; url: string }>
export const isPieceSet = (value: string): value is PieceSet => pieceSetNames.some((name) => name === value)
export const isSavedPieceSet = (value: string): value is PieceSet | 'classic' | 'sculpted' =>
  isPieceSet(value) || value === 'classic' || value === 'sculpted'
