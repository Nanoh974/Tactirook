import AsyncStorage from '@react-native-async-storage/async-storage'
import manifest from './puzzleManifest.json'
import { readSeenPuzzles, seenPuzzlesKey, serializeSeenPuzzles } from './seenPuzzles'

jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'))

beforeEach(async () => { await AsyncStorage.clear() })

test('stores the full library compactly and restores distinct indices', async () => {
  const all = new Set(Array.from({ length: manifest.total }, (_, index) => index))
  const serialized = serializeSeenPuzzles(all)
  expect(serialized.length).toBeLessThan(120000)
  await AsyncStorage.setItem(seenPuzzlesKey, serialized)
  const restored = await readSeenPuzzles()
  expect(restored.size).toBe(manifest.total)
  expect(restored.has(0)).toBe(true)
  expect(restored.has(manifest.total - 1)).toBe(true)
})

test('rejects malformed memory and isolates a different library snapshot', async () => {
  await AsyncStorage.setItem(seenPuzzlesKey, '{')
  await expect(readSeenPuzzles()).rejects.toThrow()
  const value = JSON.parse(serializeSeenPuzzles(new Set([1])))
  await AsyncStorage.setItem(seenPuzzlesKey, JSON.stringify({ ...value, bits: 'invalid' }))
  await expect(readSeenPuzzles()).rejects.toThrow('Invalid seen puzzles memory')
  await AsyncStorage.setItem(seenPuzzlesKey, JSON.stringify({ ...value, library: 'another snapshot' }))
  expect((await readSeenPuzzles()).size).toBe(0)
  expect(() => serializeSeenPuzzles(new Set([manifest.total]))).toThrow('Invalid puzzle index')
})
