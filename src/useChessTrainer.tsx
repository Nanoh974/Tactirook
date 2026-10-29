// SPDX-License-Identifier: MPL-2.0
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Color, type Move, type PieceSymbol, type Square } from 'chess.js'
import { categories, type Category, type Puzzle } from './puzzles'
import { createPuzzlePicker, initialPuzzle } from './puzzleLibrary'
import { createPreferenceWriter } from './preferences'
import { readSeenPuzzles, seenPuzzlesKey, serializeSeenPuzzles } from './seenPuzzles'

type Status = 'playing' | 'replying' | 'wrong' | 'success'
export type PieceMotion = { from: Square; to: Square; piece: { color: Color; type: PieceSymbol } }
export type MoveMotion = { id: number; pieces: PieceMotion[] }

function moveMotions(move: Move): PieceMotion[] {
  const motions: PieceMotion[] = [{
    from: move.from,
    to: move.to,
    piece: { color: move.color, type: move.promotion ?? move.piece },
  }]
  const rank = move.color === 'w' ? '1' : '8'
  if (move.isKingsideCastle()) {
    motions.push({ from: `h${rank}` as Square, to: `f${rank}` as Square, piece: { color: move.color, type: 'r' } })
  } else if (move.isQueensideCastle()) {
    motions.push({ from: `a${rank}` as Square, to: `d${rank}` as Square, piece: { color: move.color, type: 'r' } })
  }
  return motions
}

function setup(puzzle: Puzzle) {
  const game = new Chess(puzzle.fen)
  game.move(puzzle.moves[0])
  return game.fen()
}

export function useChessTrainer(
  allowSeen = false,
  reportMemoryError?: (kind: 'load' | 'save') => void,
  ready = true,
  savedCategories?: Category[],
  onCategoriesChange?: (categories: Category[]) => void,
) {
  const [internalCategories, setSelectedCategories] = useState<Category[]>(categories.map(({ id }) => id))
  const selectedCategories = savedCategories ?? internalCategories
  const [puzzle, setPuzzle] = useState(initialPuzzle)
  const [fen, setFen] = useState(() => setup(initialPuzzle))
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState<Status>('playing')
  const [lastMove, setLastMove] = useState<[Square, Square] | null>(null)
  const [motion, setMotion] = useState<MoveMotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPuzzle, setHasPuzzle] = useState(false)
  const [seenCount, setSeenCount] = useState(0)
  const [memoryLoaded, setMemoryLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const request = useRef(0)
  const motionId = useRef(0)
  const [picker] = useState(() => ({ current: createPuzzlePicker() }))
  const seen = useRef(new Set<number>())
  const readMemory = useRef<Promise<void> | null>(null)
  const hasPuzzleRef = useRef(false)
  const selectedRef = useRef(selectedCategories)
  const allowSeenRef = useRef(allowSeen)
  allowSeenRef.current = allowSeen
  const reportErrorRef = useRef(reportMemoryError)
  reportErrorRef.current = reportMemoryError
  const writeMemory = useMemo(() => createPreferenceWriter(), [])

  const game = useMemo(() => new Chess(fen), [fen])
  const side = useMemo(() => new Chess(setup(puzzle)).turn(), [puzzle])
  const playerMoves = Math.ceil((puzzle.moves.length - 1) / 2)
  const movesPlayed = Math.floor(step / 2)
  const hasFocus = selectedCategories.length > 0
  const enabled = hasPuzzle && hasFocus && !loading && !error

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

  useEffect(() => {
    if (ready) {
      const initialCategories = savedCategories ?? selectedRef.current
      selectedRef.current = initialCategories
      setSelectedCategories(initialCategories)
      void loadNext(initialCategories)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  function persistMemory() {
    const value = serializeSeenPuzzles(seen.current)
    void writeMemory(seenPuzzlesKey, value).catch((cause: unknown) => {
      console.error('Unable to save seen puzzles', cause)
      reportErrorRef.current?.('save')
    })
  }

  function resetSeenPuzzles() {
    seen.current = new Set()
    setSeenCount(0)
    picker.current = createPuzzlePicker()
    persistMemory()
  }

  function resetPosition(nextPuzzle = puzzle, nextStatus: Status = 'playing') {
    const position = setup(nextPuzzle)
    clearReply()
    setPuzzle(nextPuzzle)
    setFen(position)
    setStep(1)
    setStatus(nextStatus)
    setLastMove(null)
    setMotion(null)
  }

  function restart() {
    request.current++
    setLoading(false)
    setError(null)
    resetPosition()
  }

  async function loadNext(selected = selectedCategories) {
    const currentRequest = ++request.current
    clearReply()
    setMotion(null)
    setLoading(true)
    setError(null)
    try {
      if (!readMemory.current) {
        readMemory.current = readSeenPuzzles().then((saved) => {
          seen.current = saved
          setSeenCount(saved.size)
          setMemoryLoaded(true)
        }).catch((cause: unknown) => {
          readMemory.current = null
          console.error('Unable to read seen puzzles', cause)
          reportErrorRef.current?.('load')
          throw cause
        })
      }
      await readMemory.current
      if (request.current !== currentRequest) return
      if (!selected.length) return
      let index: number | undefined
      const next = await picker.current(selected, hasPuzzleRef.current ? puzzle.id : '', allowSeenRef.current ? new Set() : seen.current, (value) => { index = value })
      if (request.current !== currentRequest) return
      if (index !== undefined && !seen.current.has(index)) {
        seen.current.add(index)
        setSeenCount(seen.current.size)
        persistMemory()
      }
      hasPuzzleRef.current = true
      setHasPuzzle(true)
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
    selectedRef.current = next
    onCategoriesChange?.(next)
    setLoading(false)
    setError(null)
    if (ready && next.length && (!hasPuzzleRef.current || !puzzle.themes.some((theme) => next.includes(theme)))) {
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
    setMotion({ id: ++motionId.current, pieces: moveMotions(candidate) })
    if (alternativeMate || step === puzzle.moves.length - 1) {
      setStatus('success')
      return
    }

    setStatus('replying')
    timer.current = setTimeout(() => {
      const reply = puzzle.moves[step + 1]
      const replyFrom = reply.slice(0, 2) as Square
      const replyTo = reply.slice(2, 4) as Square
      const replyMove = next.move({ from: replyFrom, to: replyTo, promotion: reply[4] })
      setFen(next.fen())
      setLastMove([replyFrom, replyTo])
      setMotion({ id: ++motionId.current, pieces: moveMotions(replyMove) })
      setStep(step + 2)
      setStatus('playing')
      timer.current = null
    }, 550)
  }

  return {
    puzzle, game, side, status, lastMove, motion, selectedCategories, enabled, hasFocus, hasPuzzle, loading, error, seenCount, memoryLoaded, resetSeenPuzzles,
    playerMoves, movesPlayed, attemptMove, toggleCategory, selectCategories,
    nextPuzzle: () => { void loadNext() },
    retry: () => { void loadNext() },
    restart,
  }
}
