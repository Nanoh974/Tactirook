import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import type { Color, PieceSymbol, Square } from 'chess.js'
import { SvgXml } from 'react-native-svg'
import type { MoveMotion, PieceMotion, useChessTrainer } from './useChessTrainer'
import { pieceXml } from './pieceXml'
import { useLocalization } from './i18n/LocalizationProvider'
import type { MessageKey } from './i18n/messages'
import { useTheme } from './ThemeProvider'
import { boardPalettes } from './boardPalettes'

const files = 'abcdefgh'
type Trainer = ReturnType<typeof useChessTrainer>
type Piece = { color: Color; type: PieceSymbol }
type Ghost = { piece: Piece; x: number; y: number }
const pieceNames: Record<PieceSymbol, MessageKey> = {
  k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn',
}

function SlidingPieces({ motions, width, side, onComplete }: {
  motions: PieceMotion[]
  width: number
  side: Color
  onComplete: () => void
}) {
  const [progress] = useState(() => new Animated.Value(0))
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    })
    animation.start(({ finished }) => { if (finished) onComplete() })
    return () => animation.stop()
  }, [progress, onComplete])

  function position(square: Square) {
    const file = files.indexOf(square[0])
    const rank = Number(square[1]) - 1
    return { x: side === 'w' ? file : 7 - file, y: side === 'w' ? 7 - rank : rank }
  }

  const size = width / 8
  return motions.map(({ from, to, piece }) => {
    const start = position(from)
    const end = position(to)
    return (
      <Animated.View
        key={`${from}-${to}`}
        testID={`sliding-piece-${from}-${to}`}
        pointerEvents="none"
        style={[styles.slidingPiece, {
          left: (end.x + 0.04) * size,
          top: (end.y + 0.04) * size,
          width: size * 0.92,
          height: size * 0.92,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [(start.x - end.x) * size, 0] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [(start.y - end.y) * size, 0] }) },
          ],
        }]}
      >
        <SvgXml xml={pieceXml[piece.color][piece.type]} width="100%" height="100%" />
      </Animated.View>
    )
  })
}

export function Board({ trainer, selected, setSelected, edgeToEdge = false }: {
  trainer: Trainer
  selected: Square | null
  setSelected: (square: Square | null) => void
  edgeToEdge?: boolean
}) {
  const { t } = useLocalization()
  const { theme, boardPalette } = useTheme()
  const palette = boardPalettes[boardPalette]
  const overlayStyles = theme === 'dark' ? darkOverlayStyles : styles
  const [width, setWidth] = useState(0)
  const [ghost, setGhost] = useState<Ghost | null>(null)
  const [finishedMotion, setFinishedMotion] = useState<MoveMotion | null>(null)
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; fen: string } | null>(null)
  const board = useRef<ComponentRef<typeof View>>(null)
  const bounds = useRef({ x: 0, y: 0, width: 0 })
  const drag = useRef<{ from: Square; piece: Piece } | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const motion = width > 0 && trainer.motion !== finishedMotion ? trainer.motion : null
  const finishMotion = useCallback(() => setFinishedMotion(trainer.motion), [trainer.motion])
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
    <View testID="chess-board" ref={board} onLayout={onLayout} onTouchStart={measure} style={[styles.board, edgeToEdge && styles.edgeToEdge]} {...pan.panHandlers}>
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
                accessibilityLabel={`${piece ? t(piece.color === 'w' ? 'whiteSquare' : 'blackSquare', { square, piece: t(pieceNames[piece.type]) }) : t('emptySquare', { square })}${isLegal ? t('legalMove') : ''}`}
                accessibilityState={{ selected: selected === square, disabled: !trainer.enabled }}
                onPress={() => chooseSquare(square)}
                style={[
                  styles.square, { backgroundColor: dark ? palette.dark : palette.light },
                  isLast && (dark ? styles.lastDark : styles.lastLight),
                  selected === square && styles.selected,
                ]}
              >
                {column === 0 && <Text style={[styles.coordinate, styles.rank, { color: palette.coordinate }]}>{rank}</Text>}
                {row === 7 && <Text style={[styles.coordinate, styles.file, { color: palette.coordinate }]}>{file}</Text>}
                {isLegal && <View pointerEvents="none" style={piece ? styles.captureHint : styles.moveHint} />}
                {piece && !motion?.pieces.some(({ to }) => to === square) && <View pointerEvents="none" style={styles.piece}><SvgXml xml={pieceXml[piece.color][piece.type]} width="100%" height="100%" /></View>}
              </Pressable>
            )
          })}
        </View>
      ))}
      {motion && <SlidingPieces key={motion.id} motions={motion.pieces} width={width} side={trainer.side} onComplete={finishMotion} />}
      {!trainer.enabled && (
        <View style={styles.disabledOverlay} pointerEvents="none">
          <Text style={styles.disabledText}>{t(trainer.loading ? 'loadingPuzzle' : trainer.error ? 'puzzleUnavailable' : 'selectFocus')}</Text>
        </View>
      )}
      {pendingPromotion && (
        <View accessibilityViewIsModal style={overlayStyles.promotionOverlay}>
          <Text style={overlayStyles.promotionTitle}>{t('promoteTo')}</Text>
          <View style={styles.promotionChoices}>
            {(['q', 'r', 'b', 'n'] as const).map((piece) => (
              <Pressable
                key={piece}
                accessibilityRole="button"
                accessibilityLabel={t('promotePiece', { piece: t(pieceNames[piece]) })}
                onPress={() => {
                  trainer.attemptMove(pendingPromotion.from, pendingPromotion.to, piece)
                  setPromotion(null)
                  setSelected(null)
                }}
                style={[styles.promotionChoice, { backgroundColor: palette.light }]}
              >
                <SvgXml xml={pieceXml[trainer.side][piece]} width="100%" height="100%" />
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('cancelPromotion')} style={styles.cancelPromotion} onPress={() => { setPromotion(null); setSelected(null) }}>
            <Text style={overlayStyles.promotionTitle}>{t('cancel')}</Text>
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
  slidingPiece: { position: 'absolute', zIndex: 3 },
})

const darkOverlayStyles = StyleSheet.create({
  ...styles,
  promotionOverlay: { ...styles.promotionOverlay, backgroundColor: '#182331f2' },
  promotionTitle: { ...styles.promotionTitle, color: '#edf3fa' },
})
