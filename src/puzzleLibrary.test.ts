// SPDX-License-Identifier: MPL-2.0
import { Platform } from 'react-native'
import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'
import { gzipSync, strToU8 } from 'fflate'
import { categories, type Puzzle } from './puzzles'
import { createPuzzlePicker } from './puzzleLibrary'

jest.unmock('./puzzleLibrary')
jest.mock('expo-file-system', () => ({
  File: class {
    readonly uri: string
    constructor(uri: string) { this.uri = uri }
    async bytes() {
      const bytes = mockFiles.get(Number(this.uri.split(':')[1]))
      if (!bytes) throw new Error(`Missing test file ${this.uri}`)
      return bytes
    }
  },
}))
jest.mock('./puzzleAssets', () => ({ indexAsset: 99, shardAssets: [100, 101, 102, 103, 104, 105, 106, 107] }))
jest.mock('./puzzleManifest.json', () => {
  const { categories } = jest.requireActual('./puzzles')
  const { puzzles } = jest.requireActual('./testPuzzleFixtures')
  return {
    total: 8, shardSize: 1, initialPuzzle: puzzles[0],
    counts: Object.fromEntries(categories.map(({ id }: { id: string }) => [id, id === 'fork' ? 3 : ['mateIn1', 'mateIn2', 'mateIn3'].includes(id) ? 2 : 0])),
  }
})

const fixtures = jest.requireActual<typeof import('./testPuzzleFixtures')>('./testPuzzleFixtures')
const puzzles = fixtures.puzzles.map((puzzle, index): Puzzle => index === 0 ? { ...puzzle, themes: [...puzzle.themes, 'fork'] } : puzzle)
const mockFiles = new Map<number, Uint8Array>()
mockFiles.set(99, gzipSync(strToU8(JSON.stringify(Object.fromEntries(categories.map(({ id }) => [id, puzzles.flatMap((puzzle, index) => puzzle.themes.includes(id) ? [index] : [])]))))))
for (let i = 0; i < 8; i++) mockFiles.set(100 + i, gzipSync(strToU8(JSON.stringify(puzzles.slice(i, i + 1)))))
const originalFetch = globalThis.fetch

beforeEach(() => {
  jest.spyOn(Asset, 'fromModule').mockImplementation((module) => {
    const asset = new Asset({ uri: `asset:${module}`, name: String(module), type: 'puzzles' })
    asset.localUri = `file:${module}`
    jest.spyOn(asset, 'downloadAsync').mockResolvedValue(asset)
    return asset
  })
  globalThis.fetch = jest.fn(async (uri) => {
    const bytes = mockFiles.get(Number(String(uri).split(':')[1]))
    if (!bytes) return new Response('Not found', { status: 404 })
    return new Response(bytes.slice())
  })
})

afterEach(() => {
  globalThis.fetch = originalFetch
  jest.restoreAllMocks()
})

test('reads web assets lazily and returns every puzzle once per cycle', async () => {
  jest.replaceProperty(Platform, 'OS', 'web')
  const pick = createPuzzlePicker()
  expect(globalThis.fetch).not.toHaveBeenCalled()
  const seen = new Set<string>()
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = await pick(categories.map(({ id }) => id), '')
    expect(seen.has(puzzle.id)).toBe(false)
    seen.add(puzzle.id)
  }
  expect(seen.size).toBe(8)
  expect(globalThis.fetch).toHaveBeenCalledTimes(8)
})

test('filters by any matching theme and deduplicates selected categories', async () => {
  jest.replaceProperty(Platform, 'OS', 'web')
  const pick = createPuzzlePicker()
  const seen = new Set<string>()
  for (let i = 0; i < 4; i++) {
    const puzzle = await pick(['mateIn1', 'fork', 'mateIn1'], '')
    expect(puzzle.themes.some((theme) => ['mateIn1', 'fork'].includes(theme))).toBe(true)
    seen.add(puzzle.id)
  }
  expect(seen.size).toBe(4)
  await expect(pick([], '')).rejects.toThrow('Select at least one')
})

test('reads packaged native files instead of fetching web URLs', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios')
  const nativeRead = jest.spyOn(File.prototype, 'bytes')
  const pick = createPuzzlePicker()
  for (let i = 0; i < puzzles.length; i++) {
    const puzzle = await pick(categories.map(({ id }) => id), '')
    expect(puzzles.some(({ id }) => id === puzzle.id)).toBe(true)
  }
  expect(globalThis.fetch).not.toHaveBeenCalled()
  expect(nativeRead).toHaveBeenCalled()
})

test('the first draw is randomized across the entire library', async () => {
  jest.replaceProperty(Platform, 'OS', 'web')
  const random = jest.spyOn(Math, 'random').mockReturnValue(0)
  let first = -1
  await createPuzzlePicker()(categories.map(({ id }) => id), '', new Set(), (index) => { first = index })
  random.mockReturnValue(0.999999)
  let second = -1
  await createPuzzlePicker()(categories.map(({ id }) => id), '', new Set(), (index) => { second = index })
  expect([first, second]).toEqual([1, 0])
})

test('avoids seen puzzles across theme changes, then permits repeats when exhausted', async () => {
  jest.replaceProperty(Platform, 'OS', 'web')
  const pick = createPuzzlePicker()
  const seen = new Set<number>([0, 1, 2, 3, 4, 5, 6])
  let index = -1
  const last = await pick(categories.map(({ id }) => id), '', seen, (value) => { index = value })
  expect(index).toBe(7)
  seen.add(index)
  const repeat = await pick(['fork'], last.id, seen, (value) => { index = value })
  expect(repeat.themes).toContain('fork')
  expect(repeat.id).not.toBe(last.id)
  seen.delete(6)
  await pick(['fork'], repeat.id, seen, (value) => { index = value })
  expect(index).toBe(6)
})

test('allowing seen puzzles makes them eligible even if unseen puzzles remain', async () => {
  jest.replaceProperty(Platform, 'OS', 'web')
  jest.spyOn(Math, 'random').mockReturnValue(0.999999)
  let index = -1
  await createPuzzlePicker()(categories.map(({ id }) => id), '', new Set(), (value) => { index = value })
  expect(index).toBe(0)
})

test('avoids repeating the current puzzle when more than one unseen puzzle is available', async () => {
  jest.replaceProperty(Platform, 'OS', 'web')
  jest.spyOn(Math, 'random').mockReturnValue(0.999999)
  const pick = createPuzzlePicker()
  const first = await pick(categories.map(({ id }) => id), '')
  const next = await createPuzzlePicker()(categories.map(({ id }) => id), first.id)
  expect(next.id).not.toBe(first.id)
  const onlyUnseen = new Set(Array.from({ length: 7 }, (_, index) => index + 1))
  const same = await createPuzzlePicker()(categories.map(({ id }) => id), first.id, onlyUnseen)
  expect(same.id).toBe(first.id)
})
