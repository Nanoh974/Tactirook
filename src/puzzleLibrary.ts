import { Asset } from 'expo-asset'
import { File } from 'expo-file-system'
import { Platform } from 'react-native'
import { gunzipSync, strFromU8 } from 'fflate'
import { indexAsset, shardAssets } from './puzzleAssets'
import manifest from './puzzleManifest.json'
import { categories, isPuzzle, type Category, type Puzzle } from './puzzles'

export const puzzleCounts: Record<Category, number> = manifest.counts
export const libraryTotal = manifest.total
if (!isPuzzle(manifest.initialPuzzle)) throw new Error('Invalid initial puzzle in library manifest')
export const initialPuzzle: Puzzle = manifest.initialPuzzle

async function readAsset(module: number): Promise<unknown> {
  const asset = Asset.fromModule(module)
  let bytes: Uint8Array
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri)
    if (!response.ok) throw new Error(`Puzzle file unavailable (HTTP ${response.status})`)
    bytes = new Uint8Array(await response.arrayBuffer())
  } else {
    await asset.downloadAsync()
    if (!asset.localUri) throw new Error('Puzzle file download did not produce a local file')
    bytes = await new File(asset.localUri).bytes()
  }
  return JSON.parse(strFromU8(gunzipSync(bytes)))
}

type ThemeIndex = Record<Category, number[]>
let themeIndex: Promise<ThemeIndex> | undefined
const shards = new Map<number, Promise<Puzzle[]>>()

async function loadIndex(): Promise<ThemeIndex> {
  if (!themeIndex) {
    themeIndex = readAsset(indexAsset).then((value: unknown) => {
      if (!value || typeof value !== 'object') throw new Error('Invalid puzzle theme index')
      const index = value as Record<string, unknown>
      for (const { id } of categories) {
        const rows = index[id]
        if (!Array.isArray(rows) || rows.length !== puzzleCounts[id] ||
          !rows.every((row: unknown) => typeof row === 'number' && Number.isInteger(row) && row >= 0 && row < libraryTotal)) {
          throw new Error(`Invalid puzzle index for ${id}`)
        }
      }
      return index as ThemeIndex
    }).catch((error: unknown) => {
      themeIndex = undefined
      throw error
    })
  }
  return themeIndex
}

async function loadPuzzle(index: number): Promise<Puzzle> {
  const shardId = Math.floor(index / manifest.shardSize)
  let pending = shards.get(shardId)
  if (!pending) {
    const asset = shardAssets[shardId]
    if (asset === undefined) throw new Error(`Missing puzzle shard ${shardId}`)
    pending = readAsset(asset).then((value: unknown) => {
      if (!Array.isArray(value) || !value.every(isPuzzle)) throw new Error(`Invalid puzzle shard ${shardId}`)
      return value
    }).catch((error: unknown) => {
      shards.delete(shardId)
      throw error
    })
    const oldest = shards.keys().next().value
    if (shards.size >= 4 && oldest !== undefined) shards.delete(oldest)
    shards.set(shardId, pending)
  }
  const puzzle = (await pending)[index % manifest.shardSize]
  if (!puzzle) throw new Error(`Puzzle index ${index} is outside its shard`)
  return puzzle
}

export function createPuzzlePicker() {
  let selectionKey = ''
  let pool: number[] = []
  let cursor = 0

  return async function pickPuzzle(selected: Category[], avoidId: string): Promise<Puzzle> {
    if (!selected.length) throw new Error('Select at least one puzzle theme')
    const key = [...selected].sort().join(',')
    if (key !== selectionKey || cursor >= pool.length) {
      let eligible: number[]
      if (selected.length === categories.length) {
        eligible = Array.from({ length: libraryTotal }, (_, index) => index)
      } else {
        const index = await loadIndex()
        eligible = [...new Set(selected.flatMap((theme) => index[theme]))]
      }
      if (!eligible.length) throw new Error('No puzzles available for the selected themes')
      for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[eligible[i], eligible[j]] = [eligible[j], eligible[i]]
      }
      pool = eligible
      cursor = 0
      selectionKey = key
    }
    let puzzle = await loadPuzzle(pool[cursor++])
    // At a cycle/selection boundary, avoid immediately repeating the current puzzle.
    if (puzzle.id === avoidId && pool.length > 1) {
      if (cursor >= pool.length) cursor = 0
      puzzle = await loadPuzzle(pool[cursor++])
    }
    return puzzle
  }
}
