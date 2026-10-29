import { act, renderHook } from '@testing-library/react-native'
import type { Square } from 'chess.js'
import { puzzles, underpromotionPuzzle } from './testPuzzleFixtures'
import { createPuzzlePicker } from './puzzleLibrary'
import type { Puzzle } from './puzzles'
import { useChessTrainer } from './useChessTrainer'

jest.mock('./puzzleLibrary')

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

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
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(picker)
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
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(picker)
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.nextPuzzle())
  expect(result.current.loading).toBe(true)
  await act(() => result.current.selectCategories(['fork']))
  expect(result.current.puzzle.id).toBe('003jb')
  await act(() => resolveFirst(puzzles[1]))
  expect(result.current.puzzle.id).toBe('003jb')
  expect(result.current.loading).toBe(false)
})

test('supports explicit underpromotion and the following opponent reply', async () => {
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(async () => underpromotionPuzzle)
  const { result } = await renderHook(() => useChessTrainer())
  await act(() => result.current.nextPuzzle())
  await act(() => result.current.attemptMove('c2', 'c1', 'q'))
  expect(result.current.status).toBe('wrong')
  await act(() => result.current.attemptMove('c2', 'c1', 'n'))
  expect(result.current.status).toBe('replying')
  await act(() => jest.advanceTimersByTime(550))
  await act(() => result.current.attemptMove('c1', 'b3'))
  expect(result.current.status).toBe('success')
})
