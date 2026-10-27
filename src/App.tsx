import { useRef, useState, type PointerEvent } from 'react'
import { type PieceSymbol, type Square } from 'chess.js'
import {
  ArrowRight, Check, ChevronRight, CircleCheck, RotateCcw, Sparkles, Target,
} from 'lucide-react'
import { categories } from './puzzles'
import { useChessTrainer } from './useChessTrainer'
import styles from './App.module.scss'

const files = 'abcdefgh'
const pieceNames: Record<PieceSymbol, string> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
}

type Drag = { from: Square; piece: string; x: number; y: number; moved: boolean }

function App() {
  const trainer = useChessTrainer()
  const [selected, setSelected] = useState<Square | null>(null)
  const [ghost, setGhost] = useState<{ piece: string; x: number; y: number } | null>(null)
  const drag = useRef<Drag | null>(null)
  const suppressClick = useRef(false)
  const ranks = trainer.side === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const columns = trainer.side === 'w' ? [...files] : [...files].reverse()
  const legalSquares = selected && trainer.enabled && (trainer.status === 'playing' || trainer.status === 'wrong')
    ? trainer.game.moves({ square: selected, verbose: true }).map((move) => move.to)
    : []
  const progress = trainer.movesPlayed + (trainer.status === 'success' ? 1 : 0)

  function chooseSquare(square: Square) {
    if (!trainer.enabled || (trainer.status !== 'playing' && trainer.status !== 'wrong')) return
    const piece = trainer.game.get(square)
    if (selected === square) {
      setSelected(null)
    } else if (piece?.color === trainer.side) {
      setSelected(square)
    } else if (selected) {
      trainer.attemptMove(selected, square)
      setSelected(null)
    }
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, square: Square) {
    const piece = trainer.game.get(square)
    if (!trainer.enabled || (trainer.status !== 'playing' && trainer.status !== 'wrong') || piece?.color !== trainer.side) return
    drag.current = { from: square, piece: `${piece.color}${piece.type.toUpperCase()}`, x: event.clientX, y: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    if (!drag.current.moved && Math.hypot(event.clientX - drag.current.x, event.clientY - drag.current.y) < 7) return
    drag.current.moved = true
    setGhost({ piece: drag.current.piece, x: event.clientX, y: event.clientY })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const current = drag.current
    drag.current = null
    setGhost(null)
    if (!current.moved) return
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false }, 0)
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-square]')
    const destination = target?.dataset.square as Square | undefined
    if (destination && destination !== current.from) trainer.attemptMove(current.from, destination)
    setSelected(null)
  }

  function reset() {
    setSelected(null)
    trainer.restart()
  }

  function next() {
    setSelected(null)
    trainer.nextPuzzle()
  }

  const feedback = trainer.status === 'success'
    ? 'Puzzle solved!'
    : trainer.status === 'wrong'
      ? 'Wrong move'
      : trainer.status === 'replying'
        ? 'Opponent is moving...'
        : 'Your move'

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>♞</div>
          <span>chess<span className={styles.brandLight}>trainer</span><span className={styles.brandDot}>.</span></span>
        </div>
        <div className={styles.headerTag}><span className={styles.liveDot} /> YOUR DAILY TACTICS SPACE</div>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <div className={styles.eyebrow}><Sparkles size={14} strokeWidth={2} /> PRACTICE MAKES POSSIBLE</div>
          <h1>Make your <br />next move <br /><em>count.</em></h1>
          <p>Small puzzles. Sharper instincts. Choose what to work on and find the best move.</p>
          <div className={styles.introRule} />
          <div className={styles.sessionLabel}>THIS SESSION</div>
          <div className={styles.sessionStat}><strong>{String(trainer.solved).padStart(2, '0')}</strong><span>puzzles<br />solved</span></div>
          <div className={styles.introFoot}>One good move at a time <ArrowRight size={15} /></div>
        </section>

        <section className={styles.boardPanel} aria-label="Chess puzzle">
          <div className={styles.boardHeading}>
            <div>
              <span className={styles.sectionKicker}>THE BOARD <span className={styles.kickerLine} /></span>
              <h2>Find the best move.</h2>
            </div>
            <span className={styles.ratingBadge}>★ &nbsp; {trainer.puzzle.rating} rated</span>
          </div>

          <div className={styles.boardFrame}>
            <div className={styles.boardTopline}>
              <span className={styles.turnIcon}>♚</span>
              <span>CHESS PUZZLE</span>
              <span className={styles.puzzleId}>#{trainer.puzzle.id}</span>
            </div>
            <div
              className={`${styles.board} ${!trainer.enabled ? styles.boardDisabled : ''}`}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => { drag.current = null; setGhost(null) }}
            >
              {ranks.flatMap((rank, row) => columns.map((file, column) => {
                const square = `${file}${rank}` as Square
                const piece = trainer.game.get(square)
                const code = piece ? `${piece.color}${piece.type.toUpperCase()}` : null
                const dark = (files.indexOf(file) + rank) % 2 === 0
                const isLast = trainer.lastMove?.includes(square)
                const isLegal = legalSquares.includes(square)
                return (
                  <button
                    key={square}
                    type="button"
                    data-square={square}
                    className={[
                      styles.square, dark ? styles.dark : styles.light,
                      isLast ? styles.lastMove : '', selected === square ? styles.selected : '',
                    ].join(' ')}
                    onClick={() => {
                      if (suppressClick.current) return
                      chooseSquare(square)
                    }}
                    onPointerDown={(event) => onPointerDown(event, square)}
                    aria-label={`${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${pieceNames[piece.type]}` : ', empty'}${isLegal ? ', legal move' : ''}`}
                    aria-pressed={selected === square}
                  >
                    {column === 0 && <span className={`${styles.coordinate} ${styles.rankCoordinate}`}>{rank}</span>}
                    {row === 7 && <span className={`${styles.coordinate} ${styles.fileCoordinate}`}>{file}</span>}
                    {isLegal && <span className={piece ? styles.captureHint : styles.moveHint} />}
                    {code && <img className={styles.piece} src={`/pieces/staunty/${code}.svg`} alt="" draggable={false} />}
                  </button>
                )
              }))}
              {!trainer.enabled && <div className={styles.emptyOverlay}>Select a focus area to begin</div>}
            </div>
            <div className={styles.boardBottomline}>
              <span className={styles.playerIcon}>♔</span>
              <span>YOU PLAY {trainer.side === 'w' ? 'WHITE' : 'BLACK'}</span>
              <span className={styles.moveCount}>{Math.min(progress, trainer.playerMoves)} / {trainer.playerMoves} moves</span>
            </div>
          </div>

          <div className={`${styles.feedback} ${trainer.status === 'success' ? styles.feedbackSuccess : ''} ${trainer.status === 'wrong' ? styles.feedbackWrong : ''}`} role="status" aria-live="polite">
            <div className={styles.feedbackIcon}>{trainer.status === 'success' ? <Check size={19} /> : trainer.status === 'wrong' ? <RotateCcw size={19} /> : <Target size={19} />}</div>
            <div><strong>{trainer.enabled ? feedback : 'Ready when you are'}</strong><span>{!trainer.enabled ? 'Pick at least one puzzle type.' : trainer.status === 'success' ? 'Nicely done. Keep the momentum going.' : trainer.status === 'wrong' ? 'The position has been reset. Give it another go.' : trainer.status === 'replying' ? 'Watch the response, then find your next move.' : 'Drag a piece or click it, then click a destination.'}</span></div>
            {trainer.status === 'success' && trainer.enabled && <button className={styles.feedbackNext} onClick={next} aria-label="Next puzzle"><ArrowRight size={20} /></button>}
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <span className={styles.sectionKicker}>YOUR TRAINING <span className={styles.kickerLine} /></span>
            <h2>Choose your focus<span>.</span></h2>
            <p>Pick one or more to build your practice set.</p>
          </div>

          <div className={styles.categories} aria-label="Puzzle categories">
            {categories.map((category) => {
              const checked = trainer.selectedCategories.includes(category.id)
              return (
                <label key={category.id} className={`${styles.category} ${checked ? styles.categoryActive : ''}`}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    setSelected(null)
                    trainer.toggleCategory(category.id)
                  }} />
                  <span className={styles.categoryIcon} aria-hidden="true">{category.icon}</span>
                  <span className={styles.categoryText}><strong>{category.label}</strong><small>{category.subtitle}</small></span>
                  <span className={styles.checkbox} aria-hidden="true">{checked && <Check size={13} strokeWidth={3} />}</span>
                </label>
              )
            })}
          </div>

          <div className={styles.selectionNote}><CircleCheck size={15} /><span>{trainer.selectedCategories.length} of 4 selected</span></div>
          <div className={styles.sidebarDivider} />
          <div className={styles.currentLabel}>CURRENT CHALLENGE</div>
          <div className={styles.challenge}>
            <div className={styles.challengeIcon}><Target size={19} /></div>
            <div><strong>{trainer.enabled ? categories.find((category) => category.id === trainer.puzzle.category)?.label : 'No focus selected'}</strong><span>{trainer.enabled ? 'Find the winning sequence' : 'Select an area above'}</span></div>
            <ChevronRight size={17} className={styles.challengeChevron} />
          </div>
          <button type="button" className={styles.nextButton} onClick={next} disabled={!trainer.enabled}>
            Next puzzle <ArrowRight size={18} />
          </button>
          <button type="button" className={styles.resetButton} onClick={reset} disabled={!trainer.enabled}>
            <RotateCcw size={15} /> Restart this puzzle
          </button>
        </aside>
      </main>
      <footer className={styles.footer}><span>CHESSTRAINER</span><span>Puzzles from <a href="https://lichess.org" target="_blank" rel="noreferrer">Lichess <ArrowRight size={12} /></a> · <a href="https://github.com/lichess-org/lila/tree/master/public/piece/staunty" target="_blank" rel="noreferrer">Staunty pieces by sadsnake1</a></span></footer>
      {ghost && <img className={styles.dragGhost} style={{ left: ghost.x, top: ghost.y }} src={`/pieces/staunty/${ghost.piece}.svg`} alt="" />}
    </div>
  )
}

export default App
