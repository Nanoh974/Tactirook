import { categories, type Category } from './puzzleThemes'
export { categories, categoryGroups, type Category } from './puzzleThemes'

export type Puzzle = {
  id: string
  themes: Category[]
  fen: string
  moves: string[]
  rating: number
}

// Lichess FEN is before the opponent's first move; moves[0] sets up the puzzle.
export function isPuzzle(value: unknown): value is Puzzle {
  if (!value || typeof value !== 'object') return false
  const puzzle = value as Record<string, unknown>
  return typeof puzzle.id === 'string' && typeof puzzle.fen === 'string' &&
    typeof puzzle.rating === 'number' && Number.isInteger(puzzle.rating) &&
    Array.isArray(puzzle.moves) && puzzle.moves.length >= 2 && puzzle.moves.length % 2 === 0 &&
    puzzle.moves.every((move: unknown) => typeof move === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) &&
    Array.isArray(puzzle.themes) && puzzle.themes.length > 0 &&
    puzzle.themes.every((theme: unknown) => typeof theme === 'string' && categories.some(({ id }) => id === theme))
}
