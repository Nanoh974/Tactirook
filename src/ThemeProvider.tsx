import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Alert } from 'react-native'
import { useLocalization } from './i18n/LocalizationProvider'
import { createPreferenceWriter, readPreference } from './preferences'
import { isBoardPalette, type BoardPalette } from './boardPalettes'

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
} | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { t } = useLocalization()
  const [theme, updateTheme] = useState<Theme>('light')
  const [boardPalette, updateBoardPalette] = useState<BoardPalette>('brown')
  const [boardPosition, updateBoardPosition] = useState<BoardPosition>('top')
  const [allowSeen, updateAllowSeen] = useState(false)
  const [seenOptionReady, setSeenOptionReady] = useState(false)
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
      Alert.alert(reportReadError.current('themeLoadError'), reportReadError.current('tryAgain'))
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
      Alert.alert(reportReadError.current('boardPaletteLoadError'), reportReadError.current('tryAgain'))
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
      Alert.alert(reportReadError.current('boardPositionLoadError'), reportReadError.current('tryAgain'))
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
      Alert.alert(reportReadError.current('seenOptionLoadError'), reportReadError.current('tryAgain'))
    }).finally(() => {
      if (active) setSeenOptionReady(true)
    })
    return () => { active = false }
  }, [])

  const setTheme = useCallback((next: Theme) => {
    changes.current++
    updateTheme(next)
    void writePreference(storageKey, next).catch((error: unknown) => {
      console.error('Unable to save theme preference', error)
      Alert.alert(t('themeSaveError'), t('tryAgain'))
    })
  }, [t, writePreference])
  const setBoardPalette = useCallback((next: BoardPalette) => {
    boardChanges.current++
    updateBoardPalette(next)
    void writeBoardPreference('chesstrainer.boardPalette', next).catch((error: unknown) => {
      console.error('Unable to save board palette preference', error)
      Alert.alert(t('boardPaletteSaveError'), t('tryAgain'))
    })
  }, [t, writeBoardPreference])
  const setBoardPosition = useCallback((next: BoardPosition) => {
    positionChanges.current++
    updateBoardPosition(next)
    void writePositionPreference('chesstrainer.boardPosition', next).catch((error: unknown) => {
      console.error('Unable to save board position preference', error)
      Alert.alert(t('boardPositionSaveError'), t('tryAgain'))
    })
  }, [t, writePositionPreference])
  const setAllowSeen = useCallback((next: boolean) => {
    seenChanges.current++
    updateAllowSeen(next)
    void writeSeenPreference('chesstrainer.allowSeen', next ? 'allow' : 'avoid').catch((error: unknown) => {
      console.error('Unable to save seen puzzle preference', error)
      Alert.alert(t('seenOptionSaveError'), t('tryAgain'))
    })
  }, [t, writeSeenPreference])
  const value = useMemo(() => ({ theme, setTheme, boardPalette, setBoardPalette, boardPosition, setBoardPosition, allowSeen, setAllowSeen, seenOptionReady }), [theme, setTheme, boardPalette, setBoardPalette, boardPosition, setBoardPosition, allowSeen, setAllowSeen, seenOptionReady])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useTheme() {
  const context = useContext(Context)
  if (!context) throw new Error('ThemeProvider is missing')
  return context
}
