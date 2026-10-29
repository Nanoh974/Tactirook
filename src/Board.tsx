import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { SvgXml } from 'react-native-svg'
import type { useChessTrainer } from './useChessTrainer'
import { pieceXml } from './pieceXml'

const files = 'abcdefgh'
type Trainer = ReturnType<typeof useChessTrainer>
type Piece = { color: Color; type: PieceSymbol }
type Ghost = { piece: Piece; x: number; y: number }
const pieceNames: Record<PieceSymbol, string> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
}

export function Board({ trainer, selected, setSelected, edgeToEdge = false }: {
  trainer: Trainer
  selected: Square | null
  setSelected: (square: Square | null) => void
  edgeToEdge?: boolean
}) {
  const [width, setWidth] = useState(0)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; fen: string } | null>(null)
  const board = useRef<ComponentRef<typeof View>>(null)
  const bounds = useRef({ x: 0, y: 0, width: 0 })
  const drag = useRef<{ from: Square; piece: Piece } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const ranks = trainer.side === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8]
  const columns = trainer.side === 'w' ? [...files] : [...files].reverse()
  const legalSquares = selected && trainer.enabled && (trainer.status === 'playing' || trainer.status === 'wrong')
    ? trainer.game.moves({ square: selected, verbose: true }).map((move) => move.to)
    : []
  const pendingPromotion = promotion && trainer.enabled && selected === promotion.from && trainer.game.fen() === promotion.fen
    ? promotion
    : null
  const requestMove = useCallback((from: Square, to: Square) => {
    if (trainer.game.moves({ square: from, verbose: true }).some((move) => move.to === to && move.promotion)) {
      setPromotion({ from, to, fen: trainer.game.fen() })
      setSelected(from)
    } else {
      trainer.attemptMove(from, to)
      setSelected(null)
    }
  }, [trainer, setSelected])

  const measure = useCallback(() => {
    board.current?.measureInWindow((x, y, measuredWidth) => {
      bounds.current = { x, y, width: measuredWidth }
    })
  }, [])

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width)
    measure()
  }

  const pan = useMemo(() => {
    function squareAt(x: number, y: number): Square | null {
      const { x: left, y: top, width: size } = bounds.current
      if (!size || x < left || y < top || x >= left + size || y >= top + size) return null
      const column = Math.floor((x - left) / (size / 8))
      const row = Math.floor((y - top) / (size / 8))
      const side = trainer.side
      const file = side === 'w' ? files[column] : files[7 - column]
      const rank = side === 'w' ? 8 - row : row + 1
      return `${file}${rank}` as Square
    }

    // Responder callbacks read these refs only when a gesture occurs.
    // eslint-disable-next-line react-hooks/refs
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => {
        measure()
        start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
        return false
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        if (!trainer.enabled || (trainer.status !== 'playing' && trainer.status !== 'wrong')) return false
        if (Math.hypot(gesture.dx, gesture.dy) < 7) return false
        const from = start.current && squareAt(start.current.x, start.current.y)
        const piece = from && trainer.game.get(from)
        if (!from || !piece || piece.color !== trainer.side) return false
        drag.current = { from, piece }
        return true
      },
      onPanResponderMove: (_, gesture) => {
        if (drag.current) {
          setGhost({ piece: drag.current.piece, x: gesture.moveX - bounds.current.x, y: gesture.moveY - bounds.current.y })
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const destination = squareAt(gesture.moveX, gesture.moveY)
        if (drag.current && destination && destination !== drag.current.from) {
          requestMove(drag.current.from, destination)
        } else setSelected(null)
        drag.current = null
        start.current = null
        setGhost(null)
      },
      onPanResponderTerminate: () => {
        drag.current = null
        start.current = null
        setGhost(null)
      },
    })
  }, [measure, trainer, setSelected, requestMove])

  function chooseSquare(square: Square) {
    if (!trainer.enabled || (trainer.status !== 'playing' && trainer.status !== 'wrong')) return
    const piece = trainer.game.get(square)
    if (selected === square) setSelected(null)
    else if (piece?.color === trainer.side) setSelected(square)
    else if (selected) {
      requestMove(selected, square)
    }
  }

  return (
    <View ref={board} onLayout={onLayout} onTouchStart={measure} style={[styles.board, edgeToEdge && styles.edgeToEdge]} {...pan.panHandlers}>
      {ranks.map((rank, row) => (
        <View key={rank} style={styles.row}>
          {columns.map((file, column) => {
            const square = `${file}${rank}` as Square
            const piece = trainer.game.get(square)
            const dark = (files.indexOf(file) + rank) % 2 === 0
            const isLegal = legalSquares.includes(square)
            const isLast = trainer.lastMove?.includes(square)
            return (
              <Pressable
                key={square}
                accessibilityRole="button"
                accessibilityLabel={`${square}, ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${pieceNames[piece.type]}` : 'empty'}${isLegal ? ', legal move' : ''}`}
                accessibilityState={{ selected: selected === square, disabled: !trainer.enabled }}
                onPress={() => chooseSquare(square)}
                style={[
                  styles.square, dark ? styles.dark : styles.light,
                  isLast && (dark ? styles.lastDark : styles.lastLight),
                  selected === square && styles.selected,
                ]}
              >
                {column === 0 && <Text style={[styles.coordinate, styles.rank, { color: dark ? '#f6e4c4' : '#a1714e' }]}>{rank}</Text>}
                {row === 7 && <Text style={[styles.coordinate, styles.file, { color: dark ? '#f6e4c4' : '#a1714e' }]}>{file}</Text>}
                {isLegal && <View pointerEvents="none" style={piece ? styles.captureHint : styles.moveHint} />}
                {piece && <View pointerEvents="none" style={styles.piece}><SvgXml xml={pieceXml[piece.color][piece.type]} width="100%" height="100%" /></View>}
              </Pressable>
            )
          })}
        </View>
      ))}
      {!trainer.enabled && (
        <View style={styles.disabledOverlay} pointerEvents="none">
          <Text style={styles.disabledText}>{trainer.loading ? 'Loading puzzle...' : trainer.error ? 'Puzzle unavailable' : 'Select a focus area to begin'}</Text>
        </View>
      )}
      {pendingPromotion && (
        <View accessibilityViewIsModal style={styles.promotionOverlay}>
          <Text style={styles.promotionTitle}>Promote to</Text>
          <View style={styles.promotionChoices}>
            {(['q', 'r', 'b', 'n'] as const).map((piece) => (
              <Pressable
                key={piece}
                accessibilityRole="button"
                accessibilityLabel={`Promote to ${pieceNames[piece]}`}
                onPress={() => {
                  trainer.attemptMove(pendingPromotion.from, pendingPromotion.to, piece)
                  setPromotion(null)
                  setSelected(null)
                }}
                style={styles.promotionChoice}
              >
                <SvgXml xml={pieceXml[trainer.side][piece]} width="100%" height="100%" />
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel promotion" style={styles.cancelPromotion} onPress={() => { setPromotion(null); setSelected(null) }}>
            <Text style={styles.promotionTitle}>Cancel</Text>
          </Pressable>
        </View>
      )}
      {ghost && width > 0 && (
        <View pointerEvents="none" style={[styles.ghost, { width: width / 8, height: width / 8, left: ghost.x - width / 16, top: ghost.y - width / 16 }]}>
          <SvgXml xml={pieceXml[ghost.piece.color][ghost.piece.type]} width="100%" height="100%" />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  board: { width: '100%', aspectRatio: 1, overflow: 'hidden', borderRadius: 3 },
  edgeToEdge: { borderRadius: 0 },
  promotionOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#f8f6f1ed', justifyContent: 'center', alignItems: 'center', gap: 12 },
  promotionTitle: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '700', color: '#26342c' },
  promotionChoices: { flexDirection: 'row', gap: 8 },
  promotionChoice: { width: 48, height: 48, borderRadius: 6, backgroundColor: '#f2dfbd' },
  cancelPromotion: { minHeight: 44, padding: 10, justifyContent: 'center' },
  row: { flexDirection: 'row', flex: 1 },
  square: { width: '12.5%', alignItems: 'center', justifyContent: 'center' },
  light: { backgroundColor: '#f2dfbd' },
  dark: { backgroundColor: '#ae7957' },
  lastLight: { backgroundColor: '#e8d79b' },
  lastDark: { backgroundColor: '#bca568' },
  selected: { backgroundColor: '#e3c56d' },
  piece: { width: '92%', height: '92%' },
  coordinate: { position: 'absolute', fontSize: 10, fontWeight: '700', zIndex: 2 },
  rank: { top: 3, left: 3 },
  file: { right: 3, bottom: 2 },
  moveHint: { position: 'absolute', width: '24%', height: '24%', borderRadius: 100, backgroundColor: '#203d3260' },
  captureHint: { position: 'absolute', width: '90%', height: '90%', borderRadius: 100, borderWidth: 4, borderColor: '#203d3270', zIndex: 2 },
  disabledOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#202a20a1', padding: 20 },
  disabledText: { color: '#fff', fontSize: 21, textAlign: 'center', fontFamily: 'DMSerif' },
  ghost: { position: 'absolute', zIndex: 5 },
})
