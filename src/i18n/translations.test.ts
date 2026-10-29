// SPDX-License-Identifier: MPL-2.0
import { categories, categoryGroups } from '../puzzles'
import { english, messages } from './messages'
import { groupLabel, themeLabel } from './themes'
import { deviceLanguage, languages, normalizeSearch, translate } from './translations'

test('all seven languages cover every message and preserve interpolation parameters', () => {
  for (const { id } of languages) {
    expect(Object.keys(messages[id]).sort()).toEqual(Object.keys(english).sort())
    for (const key of Object.keys(english) as (keyof typeof english)[]) {
      expect(messages[id][key].trim()).not.toBe('')
      const placeholders = (value: string) => [...value.matchAll(/\{\w+\}/g)].map(([match]) => match).sort()
      expect(placeholders(messages[id][key])).toEqual(placeholders(english[key]))
    }
    for (const category of categories) expect(themeLabel(category.id, id).trim()).not.toBe('')
    for (const group of categoryGroups) expect(groupLabel(group.label, id).trim()).not.toBe('')
  }
  expect(categories).toHaveLength(73)
})

test('selects a supported device language and falls back to English', () => {
  expect(deviceLanguage([{ languageCode: 'de' }, { languageCode: 'FR' }])).toBe('fr')
  expect(deviceLanguage([{ languageCode: 'zh' }])).toBe('zh')
  expect(deviceLanguage([{ languageCode: null }, { languageCode: 'de' }])).toBe('en')
})

test('interpolates messages and normalizes accented searches', () => {
  expect(translate('fr', 'puzzlesAvailable', { count: '1 133' })).toBe('1 133 problèmes disponibles')
  expect(() => translate('fr', 'rating')).toThrow('Missing translation parameter')
  expect(normalizeSearch('  ÉCHEC  ')).toBe('echec')
})
