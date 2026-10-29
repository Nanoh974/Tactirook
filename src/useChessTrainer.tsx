import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { categories, type Category, type Puzzle } from './puzzles'
import { createPuzzlePicker, initialPuzzle } from './puzzleLibrary'

type Status = 'playing' | 'replying' | 'wrong' | 'success'

function setup(puzzle: Puzzle) {
  const game = new Chess(puzzle.fen)
  game.move(puzzle.moves[0])
  return game.fen()
}

export function useChessTrainer() {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(categories.map(({ id }) => id))
  const [puzzle, setPuzzle] = useState(initialPuzzle)
  const [fen, setFen] = useState(() => setup(initialPuzzle))
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState<Status>('playing')
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef(0)
  const pickPuzzle = useMemo(() => createPuzzlePicker(), [])

  const game = useMemo(() => new Chess(fen), [fen])
  const side = useMemo(() => new Chess(setup(puzzle)).turn(), [puzzle])
  const playerMoves = Math.ceil((puzzle.moves.length - 1) / 2)
  const movesPlayed = Math.floor(step / 2)
  const hasFocus = selectedCategories.length > 0
  const enabled = hasFocus && !loading && !error

  function clearReply() {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  useEffect(() => () => {
    request.current++
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  function resetPosition(nextPuzzle = puzzle, nextStatus: Status = 'playing') {
    const position = setup(nextPuzzle)
    clearReply()
    setPuzzle(nextPuzzle)
    setFen(position)
    setStep(1)
    setStatus(nextStatus)
    setLastMove(null)
  }

  function restart() {
    request.current++
    setLoading(false)
    setError(null)
    resetPosition()
  }

  async function loadNext(selected = selectedCategories) {
    if (!selected.length) return
    const currentRequest = ++request.current
    clearReply()
    setLoading(true)
    setError(null)
    try {
      const next = await pickPuzzle(selected, puzzle.id)
      if (request.current !== currentRequest) return
      resetPosition(next)
    } catch (cause: unknown) {
      if (request.current !== currentRequest) return
      console.error('Unable to load puzzle', cause)
      setError(cause instanceof Error ? cause.message : 'Unable to read the puzzle library')
    } finally {
      if (request.current === currentRequest) setLoading(false)
    }
  }

  function selectCategories(next: Category[]) {
    request.current++
    clearReply()
    setSelectedCategories(next)
    setLoading(false)
    setError(null)
    if (next.length && !puzzle.themes.some((theme) => next.includes(theme))) {
      void loadNext(next)
    } else if (status === 'replying') {
      resetPosition()
    }
  }

  function toggleCategory(category: Category) {
    selectCategories(selectedCategories.includes(category)
      ? selectedCategories.filter((id) => id !== category)
      : [...selectedCategories, category])
  }

  function attemptMove(from: Square, to: Square, promotion: PieceSymbol = 'q') {
    if (!enabled || (status !== 'playing' && status !== 'wrong') || game.turn() !== side) return

    const candidate = game.moves({ square: from, verbose: true })
      .find((move) => move.to === to && (!move.promotion || move.promotion === promotion))
    const next = new Chess(fen)
    if (candidate) next.move(candidate)
    const alternativeMate = puzzle.themes.includes('mateIn1') && next.isCheckmate()
    if (!candidate || (`${from}${to}${candidate.promotion ?? ''}` !== puzzle.moves[step] && !alternativeMate)) {
      resetPosition(puzzle, 'wrong')
      return
    }

    setFen(next.fen())
    setLastMove([from, to])
    if (alternativeMate || step === puzzle.moves.length - 1) {
      setStatus('success')
      return
    }

    setStatus('replying')
    timer.current = setTimeout(() => {
      const reply = puzzle.moves[step + 1]
      const replyFrom = reply.slice(0, 2) as Square
      const replyTo = reply.slice(2, 4) as Square
      next.move({ from: replyFrom, to: replyTo, promotion: reply[4] })
      setFen(next.fen())
      setLastMove([replyFrom, replyTo])
      setStep(step + 2)
      setStatus('playing')
      timer.current = null
    }, 550)
  }

  return {
    puzzle, game, side, status, lastMove, selectedCategories, enabled, hasFocus, loading, error,
    playerMoves, movesPlayed, attemptMove, toggleCategory, selectCategories,
    nextPuzzle: () => { void loadNext() },
    retry: () => { void loadNext() },
    restart,
  }
}
