// SPDX-License-Identifier: MPL-2.0
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'
import { categories } from '../src/puzzleThemes.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const manifest = JSON.parse(await readFile(`${root}src/puzzleManifest.json`, 'utf8'))
const indexes = JSON.parse(gunzipSync(await readFile(`${root}assets/puzzles/index.puzzles`)))
const knownThemes = new Set(categories.map(({ id }) => id))
const counts = Object.fromEntries(categories.map(({ id }) => [id, 0]))
const ids = new Set()
let total = 0
let moves = 0
for (let shardId = 0; shardId < Math.ceil(manifest.total / manifest.shardSize); shardId++) {
  const file = `${root}assets/puzzles/pack-${String(shardId).padStart(4, '0')}.puzzles`
  const puzzles = JSON.parse(gunzipSync(await readFile(file)))
  assert.equal(puzzles.length, Math.min(manifest.shardSize, manifest.total - total))
  for (const puzzle of puzzles) {
    assert(!ids.has(puzzle.id), `Duplicate puzzle ${puzzle.id}`)
    ids.add(puzzle.id)
    assert(Number.isInteger(puzzle.rating), `Invalid rating ${puzzle.id}`)
    assert(puzzle.moves.length >= 2 && puzzle.moves.length % 2 === 0, `Invalid solution ${puzzle.id}`)
    assert.equal(new Set(puzzle.themes).size, puzzle.themes.length)
    for (const theme of puzzle.themes) {
      assert(knownThemes.has(theme), `Unknown theme ${theme}`)
      assert.equal(indexes[theme][counts[theme]++], total, `Incorrect index ${theme} at ${puzzle.id}`)
    }
    try {
      const game = new Chess(puzzle.fen)
      for (const uci of puzzle.moves) {
        assert.match(uci, /^[a-h][1-8][a-h][1-8][qrbn]?$/)
        game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
        moves++
      }
    } catch (error) {
      throw new Error(`Invalid FEN or solution for ${puzzle.id}: ${error.message}`, { cause: error })
    }
    total++
  }
  if (total % 25000 === 0) console.log(`${total.toLocaleString('en')} puzzles replayed`)
}
assert.equal(total, manifest.total)
for (const { id } of categories) {
  assert.equal(counts[id], manifest.counts[id])
  assert.equal(indexes[id].length, counts[id])
  assert(counts[id] >= Math.min(manifest.targetPerTheme, manifest.sourceCounts[id]), `Insufficient coverage for ${id}`)
}
assert.equal(manifest.initialPuzzle.id, [...ids][0])
console.log(`Verified ${total.toLocaleString('en')} unique puzzles, ${moves.toLocaleString('en')} legal moves, ${categories.length} themes and all indexes.`)
