// SPDX-License-Identifier: MPL-2.0
import type { Puzzle } from './puzzles'

export const puzzles: Puzzle[] = [
  { id: '001KR', themes: ['mateIn1'], fen: '6Qk/p1p3pp/4N3/1p6/2q1r1n1/2B5/PP4PP/3R1R1K b - - 0 28', moves: ['h8g8', 'f1f8'], rating: 603 },
  { id: '00465', themes: ['mateIn1'], fen: '3r1Q1k/pp4pp/2p5/6q1/5R2/2P5/P1P2PPP/3rR1K1 b - - 8 27', moves: ['d8f8', 'f4f8'], rating: 596 },
  { id: '001Wz', themes: ['mateIn2'], fen: '4r1k1/5ppp/r1p5/p1n1RP2/8/2P2N1P/2P3P1/3R2K1 b - - 0 21', moves: ['e8e5', 'd1d8', 'e5e8', 'd8e8'], rating: 1118 },
  { id: '002Mm', themes: ['mateIn2'], fen: 'rn1qr1k1/ppp3pQ/3p1pP1/3Pp3/2P1P3/8/PP3PP1/R1B1K3 b Q - 2 16', moves: ['g8f8', 'h7h8', 'f8e7', 'h8g7'], rating: 948 },
  { id: '001wR', themes: ['mateIn3'], fen: '6nr/pp3p1p/k1p5/8/1QN5/2P1P3/4KPqP/8 b - - 5 26', moves: ['b7b5', 'b4a5', 'a6b7', 'c4d6', 'b7b8', 'a5d8'], rating: 1179 },
  { id: '00F6y', themes: ['mateIn3'], fen: '2k3r1/ppp2prp/1q2b3/8/Q7/2P1R1P1/P4P1P/4R1K1 b - - 3 23', moves: ['e6d7', 'e3e8', 'd7e8', 'e1e8', 'g8e8', 'a4e8'], rating: 908 },
  { id: '003jb', themes: ['fork'], fen: 'r3kb1r/p4ppp/b1p1p3/3q4/3Q4/4BN2/PPP2PPP/R3K2R b KQkq - 0 11', moves: ['c6c5', 'd4a4', 'a6b5', 'a4b5'], rating: 1008 },
  { id: '008P4', themes: ['fork'], fen: '8/4k3/1p1p4/rP2p1p1/P2nP1P1/3BK3/8/R7 w - - 0 35', moves: ['e3d2', 'd4b3', 'd2c3', 'b3a1'], rating: 722 },
]

export const underpromotionPuzzle: Puzzle = {
  id: 'promotion-fixture',
  fen: '8/6pk/4p2p/8/5P2/1bQ3P1/2p1K2P/3r4 w - - 2 53',
  moves: ['c3b3', 'c2c1n', 'e2d1', 'c1b3'],
  rating: 2800,
  themes: ['underPromotion', 'promotion', 'fork'],
}

export function createFixturePicker() {
  return async (selected: string[], avoidId: string, _seen?: ReadonlySet<number>, onSelected?: (index: number) => void) => {
    const eligible = puzzles.filter((puzzle) => puzzle.themes.some((theme) => selected.includes(theme)))
    const current = puzzles.findIndex((puzzle) => puzzle.id === avoidId)
    const puzzle = eligible.find((item) => puzzles.indexOf(item) > current) ?? eligible[0]
    onSelected?.(puzzles.indexOf(puzzle))
    return puzzle
  }
}
