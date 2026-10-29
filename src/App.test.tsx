import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'
import { AccessibilityInfo, Alert, Animated, Dimensions, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import App from '../App'
import { createPuzzlePicker } from './puzzleLibrary'
import { categoryGroups } from './puzzles'
import { createFixturePicker, underpromotionPuzzle } from './testPuzzleFixtures'
import type { Puzzle } from './puzzles'
import { Children, isValidElement, type ReactNode } from 'react'
import { pieceLicenseTexts, pieceXml } from './pieceXml'
import { defaultPieceSet, pieceSetNames, pieceSets } from './pieceSets'

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }))
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default)
jest.mock('./puzzleLibrary')
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageCode: 'en' }]) }))
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'))

afterEach(async () => {
  jest.useRealTimers()
  await AsyncStorage.clear()
})

function controlAnimations() {
  return jest.spyOn(Animated, 'timing').mockImplementation((_value, config) => {
    let timer: ReturnType<typeof setTimeout>
    return {
      start: (callback) => { timer = setTimeout(() => callback?.({ finished: true }), config.duration) },
      stop: () => clearTimeout(timer),
      reset: () => clearTimeout(timer),
    }
  })
}

function artwork(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (!isValidElement<{ d?: string; xml?: string; children?: ReactNode }>(child)) return ''
    return `${child.props.d ?? ''}${child.props.xml ?? ''}${artwork(child.props.children)}`
  }).join('')
}

function firstPath(xml: string): string {
  const path = xml.match(/ d="([^"]+)"/)?.[1]
  if (!path) throw new Error('Missing piece path')
  return path
}

function mockNextPuzzle(puzzle: Puzzle) {
  const initial = createFixturePicker()
  jest.mocked(createPuzzlePicker).mockReturnValueOnce((selected, avoidId, seen, onSelected) =>
    avoidId ? Promise.resolve(puzzle) : initial(selected, avoidId, seen, onSelected))
}

test('opens the mobile menu and solves a puzzle by tapping', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  expect(screen.getByTestId('brand-icon', { includeHiddenElements: true }).props.source).toEqual(require('../assets/icon-app.png'))
  expect(screen.queryByText(/Tactirook/)).toBeNull()
  expect(screen.queryByText(/THE BOARD/)).toBeNull()
  expect(screen.queryByText('Find the best move.')).toBeNull()
  expect(screen.getByText('Puzzle #001KR')).toBeTruthy()
  expect(within(screen.getByTestId('mobile-board')).getByRole('button', { name: 'f1, white rook' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next puzzle' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Restart this puzzle' })).toBeTruthy()
  expect(screen.queryByRole('checkbox', { name: /Mates in 1/ })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('checkbox', { name: /Mates in 1/ })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))

  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Restart this puzzle' }))
  expect(screen.getByText('Your move')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  expect(screen.getByText('Puzzle #00465')).toBeTruthy()
})

test.each([375, 1280])('shows the Tactirook icon in the header at width %i', async (width) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  expect(screen.getByLabelText('Tactirook')).toBeTruthy()
  expect(screen.getByTestId('brand-icon', { includeHiddenElements: true }).props.source).toEqual(require('../assets/icon-app.png'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByTestId('brand-icon', { includeHiddenElements: true }).props.source).toEqual(require('../assets/icon-app.png'))
})

test('exposes settings states, dialog semantics and an accessible selected square', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  expect(screen.getByRole('button', { name: 'f1, white rook, selected' }).props.accessibilityState.selected).toBe(true)
  expect(screen.getByRole('button', { name: 'f8, empty, legal move' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  const menu = screen.getByTestId('training-menu')
  expect(menu.props.role).toBe('dialog')
  expect(menu.props['aria-modal']).toBe(true)
  const hideType = screen.getByRole('checkbox', { name: 'Hide puzzle type' })
  expect(hideType.props.accessibilityState.checked).toBe(false)
  await fireEvent.press(hideType)
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle type' }).props.accessibilityState.checked).toBe(true)
  expect(screen.getByRole('button', { name: 'Checkmates' }).props.accessibilityState.expanded).toBe(true)
  expect(StyleSheet.flatten(screen.getByRole('button', { name: 'Close training settings' }).props.style).width).toBeGreaterThanOrEqual(44)
})

test('respects reduced motion and announces game feedback on iOS', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValueOnce(true)
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {})
  const timing = jest.spyOn(Animated, 'timing')
  await render(<App />)
  await act(() => screen.getByTestId('chess-board').props.onLayout({ nativeEvent: { layout: { width: 320, height: 320 } } }))
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(screen.queryByTestId('sliding-piece-f1-f8')).toBeNull()
  expect(timing).not.toHaveBeenCalled()
  expect(announce).toHaveBeenCalledWith('Puzzle solved! Nicely done. Keep the momentum going.')
  announce.mockRestore()
  timing.mockRestore()
})

test('allows scrolling and preserves the board on short screens and with large text', async () => {
  const previous = { window: Dimensions.get('window'), screen: Dimensions.get('screen') }
  const size = { width: 700, height: 350, scale: 1, fontScale: 1.5 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  expect(screen.getByTestId('mobile-scroll').props.scrollEnabled).toBe(true)
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board').props.style).width).toBeGreaterThanOrEqual(192)
  await act(() => Dimensions.set(previous))
})

test('counts distinct seen puzzles, resets them, and persists the repeat option', async () => {
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByText('Puzzles seen: 1')).toBeTruthy()
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Allow seen puzzles' }))
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.allowSeen', 'allow'))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByText('Puzzles seen: 2')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Reset seen puzzles' }))
  expect(screen.getByText('Puzzles seen: 0')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.seenPuzzles', expect.any(String)))
  await unmount()

  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('checkbox', { name: 'Allow seen puzzles', checked: true })).toBeTruthy()
  expect(screen.getByText('Puzzles seen: 2')).toBeTruthy()
})

test('restores puzzle information, automatic advance and selected themes before the first draw', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Clear puzzle themes' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Mates in 2' }))
  await waitFor(async () => {
    const saved = await AsyncStorage.getItem('chesstrainer.trainingSettings')
    expect(saved && JSON.parse(saved)).toEqual({
      hidePuzzleType: true, hidePuzzleRating: true, autoNextPuzzle: true, selectedCategories: ['mateIn2'],
    })
  })
  await unmount()

  const picker = jest.fn(createFixturePicker())
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(picker)
  await render(<App />)
  expect(picker.mock.calls[0][0]).toEqual(['mateIn2'])
  expect(screen.getByText('Puzzle #001Wz')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle type', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle rating', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Mates in 2', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Mates in 1', checked: false })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()
  jest.useFakeTimers()
  await fireEvent.press(screen.getByRole('button', { name: 'd1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'd8, empty, legal move' }))
  await act(() => jest.advanceTimersByTime(550))
  await fireEvent.press(screen.getByRole('button', { name: 'd8, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'e8, black rook, legal move, last move' }))
  await act(() => jest.advanceTimersByTime(500))
  expect(screen.getByText('Puzzle #002Mm')).toBeTruthy()
})

test('restores an empty theme selection and its seen-puzzle count', async () => {
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Clear puzzle themes' }))
  await waitFor(async () => {
    const saved = await AsyncStorage.getItem('chesstrainer.trainingSettings')
    expect(saved && JSON.parse(saved).selectedCategories).toEqual([])
  })
  await unmount()
  await render(<App />)
  expect(screen.getByText('No focus selected')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByText('Puzzles seen: 1')).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Mates in 1', checked: false })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Reset seen puzzles' }))
  expect(screen.getByText('Puzzles seen: 0')).toBeTruthy()
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Mates in 2' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle #001Wz')).toBeTruthy()
})

test('merges early changes with late saved training settings before drawing', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Clear puzzle themes' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Mates in 2' }))
  await act(() => resolve(JSON.stringify({
    hidePuzzleType: false, hidePuzzleRating: true, autoNextPuzzle: true, selectedCategories: ['mateIn1'],
  })))
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle type', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle rating', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Mates in 2', checked: true })).toBeTruthy()
  await waitFor(async () => {
    const saved = await AsyncStorage.getItem('chesstrainer.trainingSettings')
    expect(saved && JSON.parse(saved).selectedCategories).toEqual(['mateIn2'])
  })
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle #001Wz')).toBeTruthy()
})

test('shows restored themes while another preference is still loading', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem)
    .mockResolvedValueOnce(JSON.stringify({
      hidePuzzleType: false, hidePuzzleRating: false, autoNextPuzzle: false, selectedCategories: ['mateIn2'],
    }))
    .mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('checkbox', { name: 'Mates in 1', checked: false })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Mates in 2', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Mates in 1' }))
  await act(() => resolve('avoid'))
  expect(screen.getByRole('checkbox', { name: 'Mates in 1', checked: true })).toBeTruthy()
  expect(screen.getByRole('checkbox', { name: 'Mates in 2', checked: true })).toBeTruthy()
})

test('serializes rapid training setting changes', async () => {
  let finishWrite: () => void = () => { throw new Error('Storage write not started') }
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await act(() => finishWrite())
  await waitFor(async () => {
    const saved = await AsyncStorage.getItem('chesstrainer.trainingSettings')
    expect(saved && JSON.parse(saved)).toMatchObject({ hidePuzzleType: true, hidePuzzleRating: true })
  })
})

test('reports training settings read and write failures', async () => {
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read training settings', 'Please try again.'))
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to save training settings', 'Please try again.'))
  alert.mockRestore()
  log.mockRestore()
})

test('reports seen memory failures and retries a failed initial read', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read seen puzzles', 'Please try again.'))
  expect(screen.queryByTestId('chess-board')).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Retry loading puzzle' }))
  expect(screen.getByTestId('chess-board')).toBeTruthy()
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to save seen puzzles', 'Please try again.'))
  alert.mockRestore()
  log.mockRestore()
})

test.each([375, 1280])('shows the player king and updates it with the puzzle at width %i', async (width) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  mockNextPuzzle(underpromotionPuzzle)
  await render(<App />)
  expect(artwork(screen.getByTestId('feedback-king', { includeHiddenElements: true }).props.children))
    .toContain(firstPath(pieceXml[defaultPieceSet].w.k))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  expect(artwork(screen.getByTestId('feedback-king', { includeHiddenElements: true }).props.children))
    .toContain(firstPath(pieceXml[defaultPieceSet].b.k))
})

test('preserves the solved and incorrect move feedback icons', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f2, empty, legal move' }))
  expect(within(screen.getByTestId('feedback-icon', { includeHiddenElements: true })).getByText('↻', { includeHiddenElements: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(within(screen.getByTestId('feedback-icon', { includeHiddenElements: true })).getByText('✓', { includeHiddenElements: true })).toBeTruthy()
})

test.each([375, 1280])('changes and restores the appearance without changing the puzzle at width %i', async (width) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('radio', { name: 'Light', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  expect(screen.getByRole('radio', { name: 'Dark', checked: true })).toBeTruthy()
  expect(StyleSheet.flatten(screen.getByTestId('training-menu').props.style).backgroundColor).toBe('#192637')
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByRole('button', { name: 'f1, white rook' })).toBeTruthy()
  expect(StyleSheet.flatten(screen.getByRole('button', { name: 'f1, white rook' }).props.style).backgroundColor).toBe('#ae7957')
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.theme', 'dark'))
  await unmount()

  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Dark', checked: true })).toBeTruthy())
  await fireEvent.press(screen.getByRole('radio', { name: 'Light' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(StyleSheet.flatten(screen.getByRole('button', { name: 'f1, white rook' }).props.style).backgroundColor).toBe('#ae7957')
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('chesstrainer.theme', 'light'))
})

test.each([
  ['Brown / cream', 'brown', '#ae7957', '#f2dfbd'],
  ['Blue', 'blue', '#7999b3', '#dbe8f3'],
  ['Green', 'green', '#778d76', '#c4cdb5'],
])('persists the %s board independently of the appearance', async (label, key, dark, light) => {
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('radio', { name: 'Brown / cream', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: label }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(StyleSheet.flatten(screen.getByRole('button', { name: /^f1, white rook/ }).props.style).backgroundColor).toBe(dark)
  expect(StyleSheet.flatten(screen.getByRole('button', { name: /^b8,/ }).props.style).backgroundColor).toBe(light)
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.boardPalette', key))
  await unmount()

  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await waitFor(() => expect(screen.getByRole('radio', { name: label, checked: true })).toBeTruthy())
  await fireEvent.press(screen.getByRole('radio', { name: 'Light' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(StyleSheet.flatten(screen.getByRole('button', { name: /^f1, white rook/ }).props.style).backgroundColor).toBe(dark)
  expect(StyleSheet.flatten(screen.getByRole('button', { name: /^b8,/ }).props.style).backgroundColor).toBe(light)
})

test('a late saved board palette cannot override a new choice', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Blue' }))
  await act(() => resolve('green'))
  expect(screen.getByRole('radio', { name: 'Blue', checked: true })).toBeTruthy()
})

test.each([375, 1280].flatMap((width) => pieceSetNames.map((set) => [width, set] as const)))(
  'switches and restores the piece set without changing the puzzle at width %i: %s', async (width, set) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  const { unmount } = await render(<App />)
  const rook = () => artwork(screen.getByRole('button', { name: 'f1, white rook' }).props.children)
  expect(rook()).toContain(firstPath(pieceXml[defaultPieceSet].w.r))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('radio', { name: pieceSets[defaultPieceSet].name, checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: pieceSets[set].name }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(rook()).toContain(firstPath(pieceXml[set].w.r))
  expect(artwork(screen.getByTestId('feedback-king', { includeHiddenElements: true }).props.children)).toContain(firstPath(pieceXml[set].w.k))
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.pieceSet', set))
  await unmount()

  await render(<App />)
  expect(rook()).toContain(firstPath(pieceXml[set].w.r))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('radio', { name: pieceSets[set].name, checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: pieceSets[defaultPieceSet].name }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(rook()).toContain(firstPath(pieceXml[defaultPieceSet].w.r))
})

test.each(['classic', 'sculpted'])('replaces retired %s pieces without an invalid-preference alert', async (legacySet) => {
  await AsyncStorage.setItem('chesstrainer.pieceSet', legacySet)
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('radio', { name: pieceSets[defaultPieceSet].name, checked: true })).toBeTruthy()
  expect(alert).not.toHaveBeenCalled()
  await unmount()
  alert.mockRestore()
})

test.each([375, 1280])('provides a source and license link at width %i', async (width) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  if (width <= 740) await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('link', { name: 'Source code & licenses' })).toBeTruthy()
})

test('displays the author and bundled license for each piece set', async () => {
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Piece artwork license' }))
  for (const set of pieceSetNames) {
    await fireEvent.press(screen.getByRole('radio', { name: pieceSets[set].name }))
    expect(screen.getByRole('link', { name: `${pieceSets[set].name} — ${pieceSets[set].author} (${pieceSets[set].license})` })).toBeTruthy()
    expect(screen.getByText(pieceLicenseTexts[set])).toBeTruthy()
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Piece artwork license' }))
  expect(screen.queryByText(pieceLicenseTexts.spatial)).toBeNull()
})

test('a late saved piece style cannot override a new choice', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem)
    .mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Chessnut' }))
  await act(() => resolve('classic'))
  expect(screen.getByRole('radio', { name: 'Chessnut', checked: true })).toBeTruthy()
})

test('reports piece style read and write failures', async () => {
  jest.mocked(AsyncStorage.getItem)
    .mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read the saved piece style', 'Please try again.'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('radio', { name: 'Chessnut' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to save the piece style', 'Please try again.'))
  alert.mockRestore()
  log.mockRestore()
})

test.each(pieceSetNames)('uses %s pieces in promotions and sliding animations', async (set) => {
  jest.useFakeTimers()
  const timing = controlAnimations()
  mockNextPuzzle(underpromotionPuzzle)
  await render(<App />)
  await act(() => screen.getByTestId('chess-board').props.onLayout({ nativeEvent: { layout: { width: 320, height: 320 } } }))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: pieceSets[set].name }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c2, black pawn' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c1, empty, legal move' }))
  expect(artwork(screen.getByRole('button', { name: 'Promote to knight' }).props.children)).toContain(firstPath(pieceXml[set].b.n))
  await fireEvent.press(screen.getByRole('button', { name: 'Promote to knight' }))
  expect(artwork(screen.getByTestId('sliding-piece-c2-c1').props.children)).toContain(firstPath(pieceXml[set].b.n))
  timing.mockRestore()
})

test('saves rapid board palette changes in order', async () => {
  let finishWrite: () => void = () => { throw new Error('Storage write not started') }
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  jest.mocked(AsyncStorage.setItem).mockClear()
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Blue' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Green' }))
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
  await act(() => finishWrite())
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('chesstrainer.boardPalette', 'green'))
  expect(await AsyncStorage.getItem('chesstrainer.boardPalette')).toBe('green')
})

test('reports board palette read and write failures', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read the saved board color', 'Please try again.'))
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Blue' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to save the board color', 'Please try again.'))
  expect(screen.getByRole('radio', { name: 'Blue', checked: true })).toBeTruthy()
  alert.mockRestore()
  log.mockRestore()
})

test('theme choice is translated and survives language changes', async () => {
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Blue' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Français' }))
  expect(screen.getByRole('radio', { name: 'Sombre', checked: true })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Bleu', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: 'Clair' }))
  expect(screen.getByRole('radio', { name: 'Clair', checked: true })).toBeTruthy()
})

test('a late saved theme cannot override a new choice', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await act(() => resolve('light'))
  expect(screen.getByRole('radio', { name: 'Dark', checked: true })).toBeTruthy()
})

test('saves rapid appearance changes in order', async () => {
  let finishWrite: () => void = () => { throw new Error('Storage write not started') }
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  jest.mocked(AsyncStorage.setItem).mockClear()
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Light' }))
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
  await act(() => finishWrite())
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('chesstrainer.theme', 'light'))
  expect(await AsyncStorage.getItem('chesstrainer.theme')).toBe('light')
})

test('changing appearance and board color preserves a solved position', async () => {
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Blue' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'f8, white rook, last move' })).toBeTruthy()
})

test('reports theme preference read and write failures', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read the saved theme preference', 'Please try again.'))
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to save the theme preference', 'Please try again.'))
  expect(screen.getByRole('radio', { name: 'Dark', checked: true })).toBeTruthy()
  alert.mockRestore()
  log.mockRestore()
})

test('changes language, searches translated themes, and restores the preference on restart', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Français' }))
  expect(screen.getByRole('radio', { name: 'Français', checked: true })).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Rechercher des thèmes'), 'fourchette')
  expect(screen.getByRole('checkbox', { name: 'Fourchettes', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Fourchettes' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Fermer les paramètres' }))
  expect(screen.getByRole('button', { name: 'f1, pièce blanche : tour' })).toBeTruthy()
  expect(screen.getByText('À vous de jouer')).toBeTruthy()
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.language', 'fr'))
  await unmount()

  await render(<App />)
  await waitFor(() => expect(screen.getByRole('button', { name: 'Votre entraînement' })).toBeTruthy())
  await fireEvent.press(screen.getByRole('button', { name: 'Votre entraînement' }))
  expect(screen.getByRole('radio', { name: 'Français', checked: true })).toBeTruthy()
})

test('switches among all supported languages without losing puzzle settings', async () => {
  const size = { width: 1280, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  for (const [label, heading] of [
    ['Español', 'Ajustes'], ['日本語', '設定'], ['简体中文', '训练设置'],
    ['हिन्दी', 'अभ्यास सेटिंग'], ['Italiano', 'Impostazioni'], ['English', 'Training settings'],
  ]) {
    await fireEvent.press(screen.getByRole('radio', { name: label }))
    expect(screen.getByRole('radio', { name: label, checked: true })).toBeTruthy()
    expect(screen.getByText(new RegExp(`^${heading}`))).toBeTruthy()
  }
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle rating', checked: true })).toBeTruthy()
})

test('a late saved preference cannot overwrite a language chosen in the menu', async () => {
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: '日本語' }))
  await act(() => resolve('fr'))
  expect(screen.getByRole('radio', { name: '日本語', checked: true })).toBeTruthy()
  expect(screen.getByRole('button', { name: '設定を閉じる' })).toBeTruthy()
})

test('saves rapid language changes in order', async () => {
  let finishWrite: () => void = () => { throw new Error('Storage write not started') }
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  jest.mocked(AsyncStorage.setItem).mockClear()
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Français' }))
  await fireEvent.press(screen.getByRole('radio', { name: '日本語' }))
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
  await act(() => finishWrite())
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('chesstrainer.language', 'ja'))
  expect(await AsyncStorage.getItem('chesstrainer.language')).toBe('ja')
})

test('uses the device language when no preference has been saved', async () => {
  const locale = getLocales()[0]
  jest.mocked(getLocales).mockReturnValue([{ ...locale, languageCode: 'fr' }])
  await render(<App />)
  expect(screen.getByRole('button', { name: 'Votre entraînement' })).toBeTruthy()
  jest.mocked(getLocales).mockReturnValue([locale])
})

test('reports preference read and write failures', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read the saved language preference', 'Please try again.'))
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Français' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Impossible d’enregistrer la langue', 'Veuillez réessayer.'))
  expect(screen.getByRole('radio', { name: 'Français', checked: true })).toBeTruthy()
  expect(log).toHaveBeenCalledTimes(2)
  alert.mockRestore()
  log.mockRestore()
})

test.each([
  ['mobile', 375],
  ['desktop', 1280],
])('keeps the settings header outside the scrollable content on %s', async (_label, width) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))

  const menu = screen.getByTestId('training-menu')
  const header = within(menu).getByTestId('training-menu-header')
  const scroll = within(menu).getByTestId('training-menu-scroll')
  expect(within(header).getByRole('button', { name: 'Close training settings' })).toBeTruthy()
  expect(within(scroll).queryByRole('button', { name: 'Close training settings' })).toBeNull()
  const menuStyle = StyleSheet.flatten(menu.props.style)
  if (width <= 740) {
    expect(menuStyle).toMatchObject({ top: 0, bottom: 0, left: 0, right: 0, width: '100%', maxWidth: '100%' })
    expect(screen.queryByRole('button', { name: 'Your training' })).toBeNull()
  } else {
    expect(menuStyle).toMatchObject({ top: 75, maxWidth: 360 })
    expect(screen.getByRole('button', { name: 'Close training menu', includeHiddenElements: true })).toBeTruthy()
  }
  await fireEvent.press(within(scroll).getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { x: 0, y: 800 } } })
  await fireEvent.press(within(header).getByRole('button', { name: 'Close training settings' }))
  expect(screen.queryByTestId('training-menu')).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('checkbox', { name: 'Hide puzzle rating', checked: true })).toBeTruthy()
})

test('mobile settings independently hide puzzle details across puzzles', async () => {
  const size = { width: 320, height: 568, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()
  expect(screen.getByText('603 rated')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()
  expect(screen.queryByText(/603 rated/)).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()
  expect(screen.queryByText(/596 rated/)).toBeNull()
})

test('mobile board uses the available width and fits short screens', async () => {
  const size = { width: 320, height: 568, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Center' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(StyleSheet.flatten(screen.getByTestId('mobile-feedback').props.style)).toMatchObject({ flex: 1, minHeight: 88 })
  await fireEvent(screen.getByTestId('mobile-content'), 'layout', { nativeEvent: { layout: { width: 320, height: 512 } } })
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board').props.style).width).toBe(320)
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board-spacer', { includeHiddenElements: true }).props.style).height).toBe(2)
  await fireEvent(screen.getByTestId('mobile-content'), 'layout', { nativeEvent: { layout: { width: 320, height: 424 } } })
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board').props.style).width).toBe(276)
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board-spacer', { includeHiddenElements: true }).props.style).height).toBe(0)
  await fireEvent(screen.getByTestId('mobile-content'), 'layout', { nativeEvent: { layout: { width: 390, height: 788 } } })
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board').props.style).width).toBe(390)
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board-spacer', { includeHiddenElements: true }).props.style).height).toBe(105)
})

test('mobile board position defaults to top and persists independently', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('radio', { name: 'Top', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: 'Center' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByTestId('mobile-board-spacer', { includeHiddenElements: true })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'f1, white rook' })).toBeTruthy()
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.boardPosition', 'center'))
  await unmount()

  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await waitFor(() => expect(screen.getByRole('radio', { name: 'Center', checked: true })).toBeTruthy())
  await fireEvent.press(screen.getByRole('radio', { name: 'Français' }))
  expect(screen.getByRole('radio', { name: 'Au milieu', checked: true })).toBeTruthy()
  await fireEvent.press(screen.getByRole('radio', { name: 'En haut' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Fermer les paramètres' }))
  expect(screen.queryByTestId('mobile-board-spacer', { includeHiddenElements: true })).toBeNull()
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith('chesstrainer.boardPosition', 'top'))
})

test('a late saved board position cannot override a new choice', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  let resolve: (value: string | null) => void = () => { throw new Error('Storage read not started') }
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockImplementationOnce(() => new Promise((done) => { resolve = done }))
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Center' }))
  await act(() => resolve('top'))
  expect(screen.getByRole('radio', { name: 'Center', checked: true })).toBeTruthy()
})

test('saves rapid board position changes in order', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  let finishWrite: () => void = () => { throw new Error('Storage write not started') }
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  jest.mocked(AsyncStorage.setItem).mockClear()
  jest.mocked(AsyncStorage.setItem).mockImplementationOnce(() => new Promise((resolve) => { finishWrite = resolve }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Center' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Top' }))
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
  await act(() => finishWrite())
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('chesstrainer.boardPosition', 'top'))
  expect(await AsyncStorage.getItem('chesstrainer.boardPosition')).toBe('top')
})

test('does not show the mobile board position setting on desktop', async () => {
  const size = { width: 1280, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.queryByRole('radiogroup', { name: 'Board position' })).toBeNull()
})

test('reports board position read and write failures', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Read failed'))
  const log = jest.spyOn(console, 'error').mockImplementation(() => {})
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
  await render(<App />)
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to read the saved board position', 'Please try again.'))
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error('Write failed'))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('radio', { name: 'Top' }))
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Unable to save the board position', 'Please try again.'))
  alert.mockRestore()
  log.mockRestore()
})

test.each([375, 1280])('slides moves briefly and cancels animation on restart at width %i', async (width) => {
  jest.useFakeTimers()
  const timing = controlAnimations()
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await act(() => screen.getByTestId('chess-board').props.onLayout({ nativeEvent: { layout: { width: 320, height: 320 } } }))
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ duration: 180, useNativeDriver: true }))
  expect(screen.getByTestId('sliding-piece-f1-f8')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'f8, white rook, last move' })).toBeTruthy()
  await act(() => jest.advanceTimersByTime(250))
  expect(screen.queryByTestId('sliding-piece-f1-f8')).toBeNull()

  await fireEvent.press(screen.getByRole('button', { name: 'Restart this puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(screen.getByTestId('sliding-piece-f1-f8')).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Restart this puzzle' }))
  expect(screen.queryByTestId('sliding-piece-f1-f8')).toBeNull()
  await act(() => jest.advanceTimersByTime(250))
  expect(screen.getByRole('button', { name: 'f1, white rook' })).toBeTruthy()
  timing.mockRestore()
})

test('slides a black promotion and the following opponent capture', async () => {
  jest.useFakeTimers()
  const timing = controlAnimations()
  mockNextPuzzle(underpromotionPuzzle)
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await act(() => screen.getByTestId('chess-board').props.onLayout({ nativeEvent: { layout: { width: 320, height: 320 } } }))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c2, black pawn' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c1, empty, legal move' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Promote to knight' }))
  const sliding = screen.getByTestId('sliding-piece-c2-c1')
  expect(StyleSheet.flatten(sliding.props.style)).toMatchObject({ left: 201.6, top: 1.6 })
  await act(() => jest.advanceTimersByTime(550))
  expect(screen.getByTestId('sliding-piece-e2-d1')).toBeTruthy()
  await act(() => jest.advanceTimersByTime(250))
  expect(screen.queryByTestId('sliding-piece-e2-d1')).toBeNull()
  timing.mockRestore()
})

test('slides both king and rook during castling', async () => {
  jest.useFakeTimers()
  const timing = controlAnimations()
  mockNextPuzzle({
    id: 'castling-fixture', themes: ['castling'], fen: '4k3/8/8/8/8/8/8/4K2R b K - 0 1',
    moves: ['e8e7', 'e1g1'], rating: 1000,
  })
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await act(() => screen.getByTestId('chess-board').props.onLayout({ nativeEvent: { layout: { width: 320, height: 320 } } }))
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'e1, white king' }))
  await fireEvent.press(screen.getByRole('button', { name: 'g1, empty, legal move' }))
  expect(screen.getByTestId('sliding-piece-e1-g1')).toBeTruthy()
  expect(screen.getByTestId('sliding-piece-h1-f1')).toBeTruthy()
  await act(() => jest.advanceTimersByTime(180))
  expect(screen.queryByTestId('sliding-piece-e1-g1')).toBeNull()
  expect(screen.queryByTestId('sliding-piece-h1-f1')).toBeNull()
  expect(screen.getByRole('button', { name: 'f1, white rook' })).toBeTruthy()
  timing.mockRestore()
})

test.each([375, 1280])('collapses theme groups independently without changing selection at width %i', async (width) => {
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  for (const group of categoryGroups) {
    expect(screen.getByRole('button', { name: group.label }).props.accessibilityState.expanded).toBe(group.label === 'Checkmates')
  }
  expect(screen.getByRole('checkbox', { name: 'Mates in 1' })).toBeTruthy()
  expect(screen.queryByRole('checkbox', { name: 'Forks' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Tactical motifs' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Forks' }))
  const checked = screen.getByRole('checkbox', { name: 'Forks' }).props.accessibilityState.checked
  await fireEvent.press(screen.getByRole('button', { name: 'Tactical motifs' }))
  expect(screen.queryByRole('checkbox', { name: 'Forks' })).toBeNull()
  expect(screen.getByRole('checkbox', { name: 'Mates in 1' })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Checkmates' }))
  expect(screen.queryByRole('checkbox', { name: 'Mates in 1' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getByRole('button', { name: 'Checkmates' }).props.accessibilityState.expanded).toBe(false)
  await fireEvent.press(screen.getByRole('button', { name: 'Tactical motifs' }))
  expect(screen.getByRole('checkbox', { name: 'Forks' }).props.accessibilityState.checked).toBe(checked)
})

test('searches collapsed Lichess themes and supports bulk selection', async () => {
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  expect(screen.getAllByRole('checkbox')).toHaveLength(categoryGroups[0].themes.length + 4)
  await fireEvent.changeText(screen.getByLabelText('Search puzzle themes'), 'under')
  expect(screen.getByRole('checkbox', { name: 'Underpromotion' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Special moves' }).props.accessibilityState.expanded).toBe(true)
  expect(screen.queryByRole('checkbox', { name: 'Forks' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Clear puzzle themes' }))
  expect(screen.getByRole('checkbox', { name: 'Underpromotion', checked: false })).toBeTruthy()
  await fireEvent.press(screen.getByRole('button', { name: 'Select all puzzle themes' }))
  expect(screen.getByRole('checkbox', { name: 'Underpromotion', checked: true })).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Search puzzle themes'), 'unknown-theme')
  expect(screen.getByText('No matching themes.')).toBeTruthy()
  await fireEvent.changeText(screen.getByLabelText('Search puzzle themes'), '')
  await fireEvent.press(screen.getByRole('button', { name: 'Tactical motifs' }))
  expect(screen.getByRole('checkbox', { name: 'Forks', checked: true })).toBeTruthy()
})

test('offers all four pieces when promoting instead of forcing a queen', async () => {
  jest.useFakeTimers()
  mockNextPuzzle(underpromotionPuzzle)
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c2, black pawn' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c1, empty, legal move' }))
  expect(screen.getByTestId('promotion-dialog').props.role).toBe('dialog')
  expect(screen.queryByRole('button', { name: 'c2, black pawn, selected' })).toBeNull()
  for (const piece of ['queen', 'rook', 'bishop', 'knight']) {
    expect(screen.getByRole('button', { name: `Promote to ${piece}` })).toBeTruthy()
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Promote to knight' }))
  await act(() => jest.advanceTimersByTime(550))
  expect(screen.getByRole('button', { name: 'c1, black knight' })).toBeTruthy()
})

test.each([
  ['mobile', 375],
  ['desktop', 1280],
])('automatically advances exactly 500ms after solving on %s', async (_label, width) => {
  jest.useFakeTimers()
  const size = { width, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  const option = screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' })
  expect(option.props.accessibilityState.checked).toBe(false)
  await fireEvent.press(option)
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()
  await act(() => jest.advanceTimersByTime(250))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await act(() => jest.advanceTimersByTime(249))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()
  await act(() => jest.advanceTimersByTime(1))
  expect(screen.getByText('Your move')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'f4, white rook' })).toBeTruthy()
})

test('automatic advance is off by default and can be cancelled while solved', async () => {
  jest.useFakeTimers()
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  await act(() => jest.advanceTimersByTime(1000))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' }))
  await act(() => jest.advanceTimersByTime(250))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await act(() => jest.advanceTimersByTime(500))
  expect(screen.getByText('Puzzle solved!')).toBeTruthy()
})

test.each(['Restart this puzzle', 'Next puzzle'])('manual %s cancels automatic advance', async (action) => {
  jest.useFakeTimers()
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  await act(() => jest.advanceTimersByTime(250))
  await fireEvent.press(screen.getByRole('button', { name: action }))
  await act(() => jest.advanceTimersByTime(500))
  expect(screen.getByText(action === 'Next puzzle' ? 'Puzzle #00465' : 'Puzzle #001KR')).toBeTruthy()
  expect(screen.getByText('Your move')).toBeTruthy()
})

test('changing the active category cancels automatic advance', async () => {
  jest.useFakeTimers()
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: /Mates in 1/ }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  await act(() => jest.advanceTimersByTime(500))
  expect(screen.getByText('Puzzle #001Wz')).toBeTruthy()

})

test('unmounting cancels automatic advance', async () => {
  jest.useFakeTimers()
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  const { unmount } = await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Automatically advance to next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout')
  const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout')
  await fireEvent.press(screen.getByRole('button', { name: 'f1, white rook' }))
  await fireEvent.press(screen.getByRole('button', { name: 'f8, empty, legal move' }))
  const timerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 500)
  expect(timerIndex).toBeGreaterThanOrEqual(0)
  const timer = setTimeoutSpy.mock.results[timerIndex].value
  await unmount()
  expect(clearTimeoutSpy).toHaveBeenCalledWith(timer)
  setTimeoutSpy.mockRestore()
  clearTimeoutSpy.mockRestore()
})

test('opens settings on desktop and hides puzzle details independently across puzzles', async () => {
  const size = { width: 1280, height: 900, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  expect(screen.getByText(/Tactirook/)).toBeTruthy()
  expect(within(screen.getByTestId('puzzle-frame')).getByText('CURRENT CHALLENGE')).toBeTruthy()
  expect(within(screen.getByTestId('puzzle-frame')).getByRole('button', { name: 'f1, white rook' })).toBeTruthy()
  expect(screen.getByText('Mates in 1')).toBeTruthy()
  expect(screen.getByText(/603 rated/)).toBeTruthy()
  expect(screen.getByText('0 / 1 moves')).toBeTruthy()
  expect(screen.queryByRole('checkbox', { name: 'Hide puzzle type' })).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()
  expect(screen.queryByText('Mates in 1')).toBeNull()
  expect(screen.queryByText('0 / 1 moves')).toBeNull()
  expect(screen.getByText(/603 rated/)).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.queryByText(/603 rated/)).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()
  expect(screen.queryByText(/596 rated/)).toBeNull()
  await fireEvent.press(screen.getByRole('button', { name: 'Restart this puzzle' }))
  expect(screen.getByText('Puzzle type hidden')).toBeTruthy()

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle type' }))
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Hide puzzle rating' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('Mates in 1')).toBeTruthy()
  expect(screen.getByText(/596 rated/)).toBeTruthy()
  expect(screen.getByText('0 / 1 moves')).toBeTruthy()
})

test('disables banner actions and hides stale puzzle details with no focus selected', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  await fireEvent.press(screen.getByRole('button', { name: 'Your training' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Clear puzzle themes' }))
  await fireEvent.press(screen.getByRole('button', { name: 'Close training settings' }))
  expect(screen.getByText('No focus selected')).toBeTruthy()
  expect(screen.queryByText(/603 rated/)).toBeNull()
  expect(screen.getByRole('button', { name: 'Next puzzle', disabled: true })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Restart this puzzle', disabled: true })).toBeTruthy()
})
