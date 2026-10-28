import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import { categories, puzzles, type Category, type Puzzle } from './puzzles'

type Status = 'playing' | 'replying' | 'wrong' | 'success'

function setup(puzzle: Puzzle) {
  const game = new Chess(puzzle.fen)
  game.move(puzzle.moves[0])
  return game.fen()
}

export function useChessTrainer() {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(categories.map(({ id }) => id))
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [fen, setFen] = useState(() => setup(puzzles[0]))
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState<Status>('playing')
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null)
  const [solved, setSolved] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const puzzle = puzzles[puzzleIndex]
  const game = useMemo(() => new Chess(fen), [fen])
  const side = new Chess(setup(puzzle)).turn()
  const playerMoves = Math.ceil((puzzle.moves.length - 1) / 2)
  const movesPlayed = Math.floor(step / 2)
  const enabled = selectedCategories.length > 0

  function clearReply() {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [])

  function restart(nextIndex = puzzleIndex, nextStatus: Status = 'playing') {
    clearReply()
    setPuzzleIndex(nextIndex)
    setFen(setup(puzzles[nextIndex]))
    setStep(1)
    setStatus(nextStatus)
    setLastMove(null)
  }

  function toggleCategory(category: Category) {
    const next = selectedCategories.includes(category)
      ? selectedCategories.filter((id) => id !== category)
      : [...selectedCategories, category]
    setSelectedCategories(next)
    if (next.length && (!selectedCategories.length || !next.includes(puzzle.category))) {
      restart(puzzles.findIndex((item) => next.includes(item.category)))
    } else if (!next.length) {
      clearReply()
    } else if (status === 'replying') {
      restart()
    }
  }

  function nextPuzzle() {
    const eligible = puzzles.map((item, index) => selectedCategories.includes(item.category) ? index : -1).filter((index) => index >= 0)
    if (!eligible.length) return
    restart(eligible.find((index) => index > puzzleIndex) ?? eligible[0])
  }

  function attemptMove(from: Square, to: Square) {
    if (!enabled || (status !== 'playing' && status !== 'wrong') || game.turn() !== side) return

    const candidate = game.moves({ square: from, verbose: true }).find((move) => move.to === to && (!move.promotion || move.promotion === 'q'))
    if (!candidate || `${from}${to}${candidate.promotion ?? ''}` !== puzzle.moves[step]) {
      restart(puzzleIndex, 'wrong')
      return
    }

    const next = new Chess(fen)
    next.move(candidate)
    setFen(next.fen())
    setLastMove([from, to])
    if (step === puzzle.moves.length - 1) {
      setStatus('success')
      setSolved((count) => count + 1)
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
    puzzle, game, side, status, lastMove, selectedCategories, enabled,
    solved, playerMoves, movesPlayed, attemptMove, toggleCategory, nextPuzzle,
    restart: () => restart(),
  }
}
