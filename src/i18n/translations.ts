// SPDX-License-Identifier: MPL-2.0
import { messages, type MessageKey } from './messages'

export type Language = keyof typeof messages
export const languages: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
  { id: 'es', label: 'Español' },
  { id: 'ja', label: '日本語' },
  { id: 'zh', label: '简体中文' },
  { id: 'hi', label: 'हिन्दी' },
  { id: 'it', label: 'Italiano' },
]

export function isLanguage(value: string): value is Language {
  return languages.some(({ id }) => id === value)
}

export function deviceLanguage(locales: readonly { languageCode: string | null }[]): Language {
  for (const locale of locales) {
    const code = locale.languageCode?.toLowerCase()
    if (code && isLanguage(code)) return code
  }
  return 'en'
}

export function translate(language: Language, key: MessageKey, values: Record<string, string | number> = {}): string {
  return messages[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    if (!(name in values)) throw new Error(`Missing translation parameter ${placeholder} for ${key}`)
    return String(values[name])
  })
}

export function normalizeSearch(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
