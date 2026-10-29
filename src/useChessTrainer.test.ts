// SPDX-License-Identifier: MPL-2.0
import { act, renderHook } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Square } from 'chess.js'
import { createFixturePicker, puzzles, underpromotionPuzzle } from './testPuzzleFixtures'
import { createPuzzlePicker } from './puzzleLibrary'
import type { Puzzle } from './puzzles'
import { useChessTrainer } from './useChessTrainer'
import { readSeenPuzzles } from './seenPuzzles'

jest.mock('./puzzleLibrary')
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'))

beforeEach(async () => { await AsyncStorage.clear(); jest.useFakeTimers() })
afterEach(() => jest.useRealTimers())

function mockNextPicker(next: ReturnType<typeof createPuzzlePicker>) {
  const initial = createFixturePicker()
  jest.mocked(createPuzzlePicker).mockReturnValueOnce((selected, avoid, seen, onSelected) =>
    avoid ? next(selected, avoid, seen, onSelected) : initial(selected, avoid, seen, onSelected))
}

test('solves fixture puzzles, including opponent replies and black moves', async () => {
  const { result } = await renderHook(() => useChessTrainer())

  for (const puzzle of puzzles) {
    expect(result.current.puzzle.id).toBe(puzzle.id)
    for (let step = 1; step < puzzle.moves.length; step += 2) {
      const move = puzzle.moves[step]
      await act(() => result.current.attemptMove(move.slice(0, 2) as Square, move.slice(2, 4) as Square))
      if (step < puzzle.moves.length - 1) {
        expect(result.current.status).toBe('replying')
        await act(() => jest.advanceTimersByTime(550))
        expect(result.current.status).toBe('playing')
      }
    }
    expect(result.current.status).toBe('success')
    await act(() => result.current.nextPuzzle())
  }
  expect(result.current.puzzle.id).toBe(puzzles[0].id)
})

test('resets the position after a wrong move and allows retrying', async () => {
  const { result } = await renderHook(() => useChessTrainer())
  const initialFen = result.current.game.fen()
  await act(() => result.current.attemptMove('f1', 'f2'))
  expect(result.current.status).toBe('wrong')
  expect(result.current.game.fen()).toBe(initialFen)
  await act(() => result.current.attemptMove('f1', 'f8'))
  expect(result.current.status).toBe('success')
  await act(() => result.current.restart())
  expect(result.current.status).toBe('playing')
  expect(result.current.game.fen()).toBe(initialFen)
})

test('accepts a different legal checkmate in one, as required by the Lichess format', async () => {
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.attemptMove('d1', 'd8'))
  expect(result.current.status).toBe('success')
  expect(result.current.game.isCheckmate()).toBe(true)
})

test('filters puzzles, disables the board and restores it when a category is selected', async () => {
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.selectCategories([]))
  expect(result.current.enabled).toBe(false)
  const position = result.current.game.fen()
  await act(() => result.current.attemptMove('f1', 'f8'))
  expect(result.current.game.fen()).toBe(position)
  await act(() => result.current.toggleCategory('fork'))
  expect(result.current.enabled).toBe(true)
  expect(result.current.puzzle.themes).toContain('fork')
  await act(() => result.current.nextPuzzle())
  expect(result.current.puzzle.id).toBe('008P4')
  expect(result.current.side).toBe('b')
})

test('cancels a pending reply when restarting or changing categories', async () => {
  const { result, unmount } = await renderHook(() => useChessTrainer())
  await act(() => result.current.toggleCategory('mateIn1'))
  expect(result.current.puzzle.id).toBe('001Wz')
  await act(() => result.current.attemptMove('d1', 'd8'))
  expect(result.current.status).toBe('replying')
  await act(() => result.current.restart())
  const restartedFen = result.current.game.fen()
  await act(() => jest.advanceTimersByTime(550))
  expect(result.current.game.fen()).toBe(restartedFen)
  expect(result.current.status).toBe('playing')

  await act(() => result.current.attemptMove('d1', 'd8'))
  await act(() => result.current.toggleCategory('mateIn2'))
  const nextFen = result.current.game.fen()
  await act(() => jest.advanceTimersByTime(550))
  expect(result.current.puzzle.themes).toContain('mateIn3')
  expect(result.current.game.fen()).toBe(nextFen)
  await unmount()
})

test('reports failed library reads and allows retrying', async () => {
  const picker = jest.fn().mockRejectedValueOnce(new Error('File unavailable')).mockResolvedValueOnce(puzzles[1])
  mockNextPicker(picker)
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.nextPuzzle())
  expect(result.current.error).toBe('File unavailable')
  expect(result.current.enabled).toBe(false)
  expect(log).toHaveBeenCalled()
  await act(() => result.current.retry())
  expect(result.current.error).toBeNull()
  expect(result.current.enabled).toBe(true)
  expect(result.current.puzzle.id).toBe('00465')
  log.mockRestore()
})

test('ignores a stale library request after changing the selected theme', async () => {
  let resolveFirst: (puzzle: Puzzle) => void = () => { throw new Error('Request not started') }
  const first = new Promise<Puzzle>((resolve) => { resolveFirst = resolve })
  const picker = jest.fn().mockReturnValueOnce(first).mockResolvedValueOnce(puzzles[6])
  mockNextPicker(picker)
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.nextPuzzle())
  expect(result.current.loading).toBe(true)
  await act(() => result.current.selectCategories(['fork']))
  expect(result.current.puzzle.id).toBe('003jb')
  await act(() => resolveFirst(puzzles[1]))
  expect(result.current.puzzle.id).toBe('003jb')
  expect(result.current.loading).toBe(false)
})

test('waits for memory before the first draw and honors a changed filter', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Memory read not started') }
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  const { result } = await renderHook(() => useChessTrainer())
  expect(result.current.hasPuzzle).toBe(false)
  await act(() => result.current.selectCategories(['fork']))
  await act(() => resolve(null))
  expect(result.current.hasPuzzle).toBe(true)
  expect(result.current.puzzle.themes).toContain('fork')
  expect(result.current.seenCount).toBe(1)
})

test('passes the saved memory to the picker only when seen puzzles are disallowed', async () => {
  const initial = createFixturePicker()
  const picker = jest.fn(initial)
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(picker)
  let allow = false
  const { result, rerender } = await renderHook(() => useChessTrainer(allow))
  expect(result.current.seenCount).toBe(1)
  await act(() => result.current.nextPuzzle())
  expect(picker.mock.calls[1][2]?.has(0)).toBe(true)
  allow = true
  await rerender(undefined)
  await act(() => result.current.nextPuzzle())
  expect(picker.mock.calls[2][2]?.size).toBe(0)
  expect(result.current.seenCount).toBe(3)
})

test('serializes a reset and subsequent draw after an earlier slow save', async () => {
  const { result } = await renderHook(() => useChessTrainer())
  let finishWrite: () => void = () => { throw new Error('Memory write not started') }
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve }))
  await act(() => result.current.nextPuzzle())
  await act(() => result.current.resetSeenPuzzles())
  await act(() => result.current.nextPuzzle())
  expect(result.current.seenCount).toBe(1)
  await act(() => finishWrite())
  expect(await readSeenPuzzles()).toEqual(new Set([2]))
})

test('waits for the saved repeat preference before drawing the first puzzle', async () => {
  const picker = jest.fn(createFixturePicker())
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(picker)
  let ready = false
  let allow = false
  const { rerender } = await renderHook(() => useChessTrainer(allow, undefined, ready))
  expect(picker).not.toHaveBeenCalled()
  ready = true
  allow = true
  await rerender(undefined)
  expect(picker).toHaveBeenCalledTimes(1)
  expect(picker.mock.calls[0][2]?.size).toBe(0)
})

test('supports explicit underpromotion and the following opponent reply', async () => {
  mockNextPicker(async () => underpromotionPuzzle)
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.nextPuzzle())
  await act(() => result.current.attemptMove('c2', 'c1', 'q'))
  expect(result.current.status).toBe('wrong')
  await act(() => result.current.attemptMove('c2', 'c1', 'n'))
  expect(result.current.motion?.pieces).toEqual([{ from: 'c2', to: 'c1', piece: { color: 'b', type: 'n' } }])
  expect(result.current.status).toBe('replying')
  await act(() => jest.advanceTimersByTime(550))
  expect(result.current.motion?.pieces).toEqual([{ from: 'e2', to: 'd1', piece: { color: 'w', type: 'k' } }])
  await act(() => result.current.attemptMove('c1', 'b3'))
  expect(result.current.status).toBe('success')
})

test.each([
  ['white', '4k3/8/8/8/8/8/8/4K2R b K - 0 1', ['e8e7', 'e1g1'], 'e1', 'g1', 'h1', 'f1', 'w'],
  ['black', '4k2r/8/8/8/8/8/8/4K3 w k - 0 1', ['e1e2', 'e8g8'], 'e8', 'g8', 'h8', 'f8', 'b'],
] as const)('records both pieces when %s castles and clears motion on restart', async (_label, fen, moves, from, to, rookFrom, rookTo, color) => {
  const puzzle: Puzzle = { id: 'castling-fixture', themes: ['castling'], fen, moves: [...moves], rating: 1000 }
  mockNextPicker(async () => puzzle)
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.nextPuzzle())
  await act(() => result.current.attemptMove(from, to))
  expect(result.current.motion?.pieces).toEqual([
    { from, to, piece: { color, type: 'k' } },
    { from: rookFrom, to: rookTo, piece: { color, type: 'r' } },
  ])
  await act(() => result.current.restart())
  expect(result.current.motion).toBeNull()
})
