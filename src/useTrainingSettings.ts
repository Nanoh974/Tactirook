// SPDX-License-Identifier: MPL-2.0
import { useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { categories, type Category } from './puzzles'
import { createPreferenceWriter } from './preferences'

type TrainingSettings = {
  hidePuzzleType: boolean
  hidePuzzleRating: boolean
  autoNextPuzzle: boolean
  selectedCategories: Category[]
}

const storageKey = 'chesstrainer.trainingSettings'
const categoryIds = new Set<string>(categories.map(({ id }) => id))
const isCategory = (value: unknown): value is Category => typeof value === 'string' && categoryIds.has(value)
const defaults: TrainingSettings = {
  hidePuzzleType: false,
  hidePuzzleRating: false,
  autoNextPuzzle: false,
  selectedCategories: categories.map(({ id }) => id),
}

function parseSettings(value: string): TrainingSettings {
  const data: unknown = JSON.parse(value)
  if (!data || typeof data !== 'object' ||
      !('hidePuzzleType' in data) || typeof data.hidePuzzleType !== 'boolean' ||
      !('hidePuzzleRating' in data) || typeof data.hidePuzzleRating !== 'boolean' ||
      !('autoNextPuzzle' in data) || typeof data.autoNextPuzzle !== 'boolean' ||
      !('selectedCategories' in data) || !Array.isArray(data.selectedCategories) ||
      !data.selectedCategories.every(isCategory) ||
      new Set(data.selectedCategories).size !== data.selectedCategories.length) {
    throw new Error('Invalid saved training settings')
  }
  return {
    hidePuzzleType: data.hidePuzzleType,
    hidePuzzleRating: data.hidePuzzleRating,
    autoNextPuzzle: data.autoNextPuzzle,
    selectedCategories: data.selectedCategories,
  }
}

export function useTrainingSettings(reportError: (kind: 'load' | 'save') => void) {
  const [settings, setSettings] = useState(defaults)
  const [ready, setReady] = useState(false)
  const current = useRef(defaults)
  const changed = useRef(new Set<keyof TrainingSettings>())
  const loaded = useRef(false)
  const report = useRef(reportError)
  useEffect(() => { report.current = reportError }, [reportError])
  const writePreference = useMemo(() => createPreferenceWriter(), [])

  function persist(value: TrainingSettings) {
    void writePreference(storageKey, JSON.stringify(value)).catch((error: unknown) => {
      console.error('Unable to save training settings', error)
      report.current('save')
    })
  }

  useEffect(() => {
    let active = true
    async function load() {
      let saved = defaults
      try {
        const value = await AsyncStorage.getItem(storageKey)
        if (value !== null) saved = parseSettings(value)
      } catch (error: unknown) {
        console.error('Unable to read training settings', error)
        if (active) report.current('load')
      }
      const merged: TrainingSettings = {
        hidePuzzleType: changed.current.has('hidePuzzleType') ? current.current.hidePuzzleType : saved.hidePuzzleType,
        hidePuzzleRating: changed.current.has('hidePuzzleRating') ? current.current.hidePuzzleRating : saved.hidePuzzleRating,
        autoNextPuzzle: changed.current.has('autoNextPuzzle') ? current.current.autoNextPuzzle : saved.autoNextPuzzle,
        selectedCategories: changed.current.has('selectedCategories') ? current.current.selectedCategories : saved.selectedCategories,
      }
      current.current = merged
      loaded.current = true
      if (changed.current.size) persist(merged)
      if (active) {
        setSettings(merged)
        setReady(true)
      }
    }
    void load()
    return () => { active = false }
    // The writer is stable, and the error callback is kept current in a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writePreference])

  function update<K extends keyof TrainingSettings>(key: K, value: TrainingSettings[K]) {
    changed.current.add(key)
    current.current = { ...current.current, [key]: value }
    setSettings(current.current)
    if (loaded.current) persist(current.current)
  }

  return { settings, ready, update }
}
