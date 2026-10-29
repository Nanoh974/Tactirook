import AsyncStorage from '@react-native-async-storage/async-storage'
import manifest from './puzzleManifest.json'

export const seenPuzzlesKey = 'chesstrainer.seenPuzzles'
const libraryId = `${manifest.sourceSha256}:${manifest.importedAt}:${manifest.total}:${manifest.shardSize}`

export async function readSeenPuzzles(): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(seenPuzzlesKey)
  if (raw === null) return new Set()
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('library' in data) || !('bits' in data) ||
      typeof data.library !== 'string' || typeof data.bits !== 'string') {
    throw new Error('Invalid seen puzzles memory')
  }
  if (data.library !== libraryId) return new Set()
  const size = Math.ceil(manifest.total / 8)
  if (data.bits.length !== size * 2 || !/^[0-9a-f]*$/.test(data.bits)) throw new Error('Invalid seen puzzles memory')
  const seen = new Set<number>()
  for (let byte = 0; byte < size; byte++) {
    const value = parseInt(data.bits.slice(byte * 2, byte * 2 + 2), 16)
    for (let bit = 0; bit < 8; bit++) {
      const index = byte * 8 + bit
      if (value & (1 << bit)) {
        if (index >= manifest.total) throw new Error('Invalid seen puzzles memory')
        seen.add(index)
      }
    }
  }
  return seen
}

export function serializeSeenPuzzles(seen: ReadonlySet<number>): string {
  const bits = new Uint8Array(Math.ceil(manifest.total / 8))
  for (const index of seen) {
    if (!Number.isInteger(index) || index < 0 || index >= manifest.total) throw new Error('Invalid puzzle index')
    bits[Math.floor(index / 8)] |= 1 << (index % 8)
  }
  return JSON.stringify({ library: libraryId, bits: Array.from(bits, (byte) => byte.toString(16).padStart(2, '0')).join('') })
}
