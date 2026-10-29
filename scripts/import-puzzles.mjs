// SPDX-License-Identifier: MPL-2.0
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createZstdDecompress, gzipSync } from 'node:zlib'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse'
import { categories } from '../src/puzzleThemes.ts'

const sourceUrl = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'
const root = fileURLToPath(new URL('../', import.meta.url))
const { values } = parseArgs({ options: {
  input: { type: 'string' },
  'per-theme': { type: 'string', default: '10000' },
} })
const target = Number(values['per-theme'])
if (!Number.isSafeInteger(target) || target < 1) throw new Error('--per-theme must be a positive integer')
const cache = `${root}.cache/puzzles`
await mkdir(cache, { recursive: true })
const input = values.input ?? `${cache}/lichess_db_puzzle.csv.zst`
if (!values.input) {
  try {
    await readFile(`${input}.sha256`, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    console.log(`Downloading ${sourceUrl}`)
    const response = await fetch(sourceUrl)
    if (!response.ok || !response.body) throw new Error(`Download failed: HTTP ${response.status}`)
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${input}.download`))
    await rename(`${input}.download`, input)
    const hash = createHash('sha256')
    for await (const chunk of createReadStream(input)) hash.update(chunk)
    await writeFile(`${input}.sha256`, hash.digest('hex'))
  }
}

const counts = Object.fromEntries(categories.map(({ id }) => [id, 0]))
const included = Object.fromEntries(categories.map(({ id }) => [id, 0]))
const knownThemes = new Set(categories.map(({ id }) => id))
const unknownThemes = new Set()
const selected = []
let scanned = 0
const hash = createHash('sha256')
const stream = createReadStream(input)
stream.on('data', (chunk) => hash.update(chunk))
const decoded = input.endsWith('.zst') ? stream.pipe(createZstdDecompress()) : stream
stream.on('error', (error) => decoded.destroy(error))
const records = decoded.pipe(parse({ columns: true, bom: true, skip_empty_lines: true }))
decoded.on('error', (error) => records.destroy(error))
for await (const record of records) {
  scanned++
  const allThemes = record.Themes.split(' ')
  const themes = allThemes.filter((theme) => knownThemes.has(theme))
  for (const theme of allThemes) if (!knownThemes.has(theme) && theme !== 'checkFirst') unknownThemes.add(theme)
  for (const theme of themes) counts[theme]++
  if (themes.some((theme) => included[theme] < target)) {
    const moves = record.Moves.split(' ')
    const rating = Number(record.Rating)
    if (!record.PuzzleId || !record.FEN || moves.length < 2 || moves.length % 2 !== 0 ||
      moves.some((move) => !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) || !Number.isInteger(rating)) {
      throw new Error(`Invalid puzzle at CSV record ${scanned}: ${record.PuzzleId}`)
    }
    selected.push({ id: record.PuzzleId, fen: record.FEN, moves, rating, themes })
    for (const theme of themes) included[theme]++
  }
  if (scanned % 1000000 === 0) console.log(`${scanned.toLocaleString('en')} scanned, ${selected.length.toLocaleString('en')} retained`)
}
if (unknownThemes.size) throw new Error(`Update puzzleThemes.ts for new Lichess themes: ${[...unknownThemes].join(', ')}`)
if (!selected.length) throw new Error('No puzzles imported; check the CSV header and theme list')

// CSV order is by random Lichess IDs, not Elo. Spread each theme through the pack.
const ids = new Set()
for (const puzzle of selected) {
  if (ids.has(puzzle.id)) throw new Error(`Duplicate puzzle ${puzzle.id}`)
  ids.add(puzzle.id)
}
const shardSize = 500
const staging = `${cache}/generated`
await mkdir(staging, { recursive: true })
for (const name of await readdir(staging)) {
  if (/^(pack-\d+|index)\.puzzles$/.test(name)) await rm(`${staging}/${name}`)
}
const indexes = Object.fromEntries(categories.map(({ id }) => [id, []]))
const requires = []
for (let offset = 0; offset < selected.length; offset += shardSize) {
  const shard = selected.slice(offset, offset + shardSize)
  const name = `pack-${String(offset / shardSize).padStart(4, '0')}.puzzles`
  await writeFile(`${staging}/${name}`, gzipSync(JSON.stringify(shard), { level: 9 }))
  requires.push(`  require('../assets/puzzles/${name}'),`)
  shard.forEach((puzzle, row) => {
    for (const theme of puzzle.themes) indexes[theme].push(offset + row)
  })
}
const manifest = {
  version: 1, source: sourceUrl, license: 'CC0-1.0',
  sourceSha256: hash.digest('hex'), importedAt: new Date().toISOString(),
  scanned, targetPerTheme: target, total: selected.length, shardSize,
  sourceCounts: counts,
  counts: Object.fromEntries(categories.map(({ id }) => [id, indexes[id].length])),
  initialPuzzle: selected[0],
}
await writeFile(`${staging}/index.puzzles`, gzipSync(JSON.stringify(indexes), { level: 9 }))
await mkdir(`${root}assets/puzzles`, { recursive: true })
// Only replace files owned by this generator after a complete successful scan.
for (const name of await readdir(`${root}assets/puzzles`)) {
  if (/^(pack-\d+|index)\.puzzles$/.test(name)) await rm(`${root}assets/puzzles/${name}`)
}
for (const name of await readdir(staging)) {
  if (/^(pack-\d+|index)\.puzzles$/.test(name)) await rename(`${staging}/${name}`, `${root}assets/puzzles/${name}`)
}
await writeFile(`${root}src/puzzleManifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
await writeFile(`${root}src/puzzleAssets.ts`, `// SPDX-License-Identifier: MPL-2.0\n// Generated by npm run import:puzzles. Do not edit.\nexport const indexAsset: number = require('../assets/puzzles/index.puzzles')\nexport const shardAssets: number[] = [\n${requires.join('\n')}\n]\n`)
console.log(JSON.stringify({ scanned, imported: selected.length, shards: requires.length, counts: manifest.counts }, null, 2))
