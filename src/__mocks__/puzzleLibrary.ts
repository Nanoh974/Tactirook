import { createFixturePicker, puzzles } from '../testPuzzleFixtures'
import manifest from '../puzzleManifest.json'

export const initialPuzzle = puzzles[0]
export const puzzleCounts = manifest.counts
export const libraryTotal = manifest.total
export const createPuzzlePicker = jest.fn(createFixturePicker)
