import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocalization } from './i18n/LocalizationProvider'
import { createPreferenceWriter, readPreference } from './preferences'
import { isBoardPalette, type BoardPalette } from './boardPalettes'
import { notify } from './notify'
import { defaultPieceSet, isPieceSet, isSavedPieceSet, type PieceSet } from './pieceSets'

export type Theme = 'light' | 'dark'
export type BoardPosition = 'top' | 'center'
const storageKey = 'chesstrainer.theme'
const isTheme = (value: string): value is Theme => value === 'light' || value === 'dark'
const isBoardPosition = (value: string): value is BoardPosition => value === 'top' || value === 'center'
const Context = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
  boardPalette: BoardPalette
  setBoardPalette: (palette: BoardPalette) => void
  boardPosition: BoardPosition
  setBoardPosition: (position: BoardPosition) => void
  allowSeen: boolean
  setAllowSeen: (allow: boolean) => void
  seenOptionReady: boolean
  pieceSet: PieceSet
  setPieceSet: (pieceSet: PieceSet) => void
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { t } = useLocalization()
  const [theme, updateTheme] = useState<Theme>('light')
  const [boardPalette, updateBoardPalette] = useState<BoardPalette>('brown')
  const [boardPosition, updateBoardPosition] = useState<BoardPosition>('top')
  const [allowSeen, updateAllowSeen] = useState(false)
  const [seenOptionReady, setSeenOptionReady] = useState(false)
  const [pieceSet, updatePieceSet] = useState<PieceSet>(defaultPieceSet)
  const pieceChanges = useRef(0)
  const writePiecePreference = useMemo(() => createPreferenceWriter(), [])
  const changes = useRef(0)
  const boardChanges = useRef(0)
  const positionChanges = useRef(0)
  const seenChanges = useRef(0)
  const writePreference = useMemo(() => createPreferenceWriter(), [])
  const writeBoardPreference = useMemo(() => createPreferenceWriter(), [])
  const writePositionPreference = useMemo(() => createPreferenceWriter(), [])
  const writeSeenPreference = useMemo(() => createPreferenceWriter(), [])
  const reportReadError = useRef(t)
  useEffect(() => { reportReadError.current = t }, [t])

  useEffect(() => {
    let active = true
    readPreference(storageKey, isTheme).then((value) => {
      if (active && changes.current === 0 && value !== null) updateTheme(value)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Unable to read theme preference', error)
      notify(reportReadError.current('themeLoadError'), reportReadError.current('tryAgain'))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    readPreference('chesstrainer.boardPalette', isBoardPalette).then((value) => {
      if (active && boardChanges.current === 0 && value !== null) updateBoardPalette(value)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Unable to read board palette preference', error)
      notify(reportReadError.current('boardPaletteLoadError'), reportReadError.current('tryAgain'))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    readPreference('chesstrainer.boardPosition', isBoardPosition).then((value) => {
      if (active && positionChanges.current === 0 && value !== null) updateBoardPosition(value)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Unable to read board position preference', error)
      notify(reportReadError.current('boardPositionLoadError'), reportReadError.current('tryAgain'))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    const isOption = (value: string): value is 'allow' | 'avoid' => value === 'allow' || value === 'avoid'
    readPreference('chesstrainer.allowSeen', isOption).then((value) => {
      if (active && seenChanges.current === 0 && value !== null) updateAllowSeen(value === 'allow')
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Unable to read seen puzzle preference', error)
      notify(reportReadError.current('seenOptionLoadError'), reportReadError.current('tryAgain'))
    }).finally(() => {
      if (active) setSeenOptionReady(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    readPreference('chesstrainer.pieceSet', isSavedPieceSet).then((value) => {
      if (active && pieceChanges.current === 0 && value !== null) {
        updatePieceSet(isPieceSet(value) ? value : defaultPieceSet)
      }
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Unable to read piece set preference', error)
      notify(reportReadError.current('pieceSetLoadError'), reportReadError.current('tryAgain'))
    })
    return () => { active = false }
  }, [])

  const setPieceSet = useCallback((next: PieceSet) => {
    pieceChanges.current++
    updatePieceSet(next)
    void writePiecePreference('chesstrainer.pieceSet', next).catch((error: unknown) => {
      console.error('Unable to save piece set preference', error)
      notify(t('pieceSetSaveError'), t('tryAgain'))
    })
  }, [t, writePiecePreference])
  const setTheme = useCallback((next: Theme) => {
    changes.current++
    updateTheme(next)
    void writePreference(storageKey, next).catch((error: unknown) => {
      console.error('Unable to save theme preference', error)
      notify(t('themeSaveError'), t('tryAgain'))
    })
  }, [t, writePreference])
  const setBoardPalette = useCallback((next: BoardPalette) => {
    boardChanges.current++
    updateBoardPalette(next)
    void writeBoardPreference('chesstrainer.boardPalette', next).catch((error: unknown) => {
      console.error('Unable to save board palette preference', error)
      notify(t('boardPaletteSaveError'), t('tryAgain'))
    })
  }, [t, writeBoardPreference])
  const setBoardPosition = useCallback((next: BoardPosition) => {
    positionChanges.current++
    updateBoardPosition(next)
    void writePositionPreference('chesstrainer.boardPosition', next).catch((error: unknown) => {
      console.error('Unable to save board position preference', error)
      notify(t('boardPositionSaveError'), t('tryAgain'))
    })
  }, [t, writePositionPreference])
  const setAllowSeen = useCallback((next: boolean) => {
    seenChanges.current++
    updateAllowSeen(next)
    void writeSeenPreference('chesstrainer.allowSeen', next ? 'allow' : 'avoid').catch((error: unknown) => {
      console.error('Unable to save seen puzzle preference', error)
      notify(t('seenOptionSaveError'), t('tryAgain'))
    })
  }, [t, writeSeenPreference])
  const value = useMemo(() => ({ theme, setTheme, boardPalette, setBoardPalette, boardPosition, setBoardPosition, allowSeen, setAllowSeen, seenOptionReady, pieceSet, setPieceSet }), [theme, setTheme, boardPalette, setBoardPalette, boardPosition, setBoardPosition, allowSeen, setAllowSeen, seenOptionReady, pieceSet, setPieceSet])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useTheme() {
  const context = useContext(Context)
  if (!context) throw new Error('ThemeProvider is missing')
  return context
}
