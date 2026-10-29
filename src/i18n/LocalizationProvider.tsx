import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppState, Platform } from 'react-native'
import { getLocales } from 'expo-localization'
import { createPreferenceWriter, readPreference } from '../preferences'
import { deviceLanguage, isLanguage, translate, type Language } from './translations'
import type { MessageKey } from './messages'
import { notify } from '../notify'

const storageKey = 'chesstrainer.language'
type Localization = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: MessageKey, values?: Record<string, string | number>) => string
  number: (value: number, compact?: boolean) => string
}
const Context = createContext<Localization | null>(null)

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>(() => deviceLanguage(getLocales()))
  const changeVersion = useRef(0)
  const manualSelection = useRef(false)
  const writePreference = useMemo(() => createPreferenceWriter(), [])

  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.lang = language === 'zh' ? 'zh-Hans' : language
  }, [language])

  useEffect(() => {
    let active = true
    readPreference(storageKey, isLanguage).then((value) => {
      if (!active || changeVersion.current !== 0 || value === null) return
      manualSelection.current = true
      updateLanguage(value)
    }).catch((error: unknown) => {
      if (!active) return
      console.error('Unable to read language preference', error)
      notify(translate(deviceLanguage(getLocales()), 'languageLoadError'), translate(deviceLanguage(getLocales()), 'tryAgain'))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !manualSelection.current) updateLanguage(deviceLanguage(getLocales()))
    })
    return () => subscription.remove()
  }, [])

  const setLanguage = useCallback((next: Language) => {
    changeVersion.current++
    manualSelection.current = true
    updateLanguage(next)
    void writePreference(storageKey, next).catch((error: unknown) => {
      console.error('Unable to save language preference', error)
      notify(translate(next, 'languageError'), translate(next, 'tryAgain'))
    })
  }, [writePreference])

  const value = useMemo<Localization>(() => ({
    language,
    setLanguage,
    t: (key, values) => translate(language, key, values),
    number: (value, compact = false) => new Intl.NumberFormat(language, compact ? { notation: 'compact', maximumFractionDigits: 1 } : undefined).format(value),
  }), [language, setLanguage])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useLocalization(): Localization {
  const context = useContext(Context)
  if (!context) throw new Error('LocalizationProvider is missing')
  return context
}
