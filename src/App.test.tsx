import { act, fireEvent, render, screen, within } from '@testing-library/react-native'
import { Dimensions, StyleSheet } from 'react-native'
import App from '../App'
import { createPuzzlePicker } from './puzzleLibrary'
import { categoryGroups } from './puzzles'
import { underpromotionPuzzle } from './testPuzzleFixtures'

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }))
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default)
jest.mock('./puzzleLibrary')

afterEach(() => jest.useRealTimers())

test('opens the mobile menu and solves a puzzle by tapping', async () => {
  const size = { width: 375, height: 812, scale: 1, fontScale: 1 }
  Dimensions.set({ window: size, screen: size })
  await render(<App />)

  expect(screen.getByText('♞')).toBeTruthy()
  expect(screen.queryByText(/chesstrainer/)).toBeNull()
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

  await fireEvent(screen.getByTestId('mobile-content'), 'layout', { nativeEvent: { layout: { width: 320, height: 512 } } })
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board').props.style).width).toBe(320)
  await fireEvent(screen.getByTestId('mobile-content'), 'layout', { nativeEvent: { layout: { width: 320, height: 424 } } })
  expect(StyleSheet.flatten(screen.getByTestId('mobile-board').props.style).width).toBe(276)
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
  expect(screen.getAllByRole('checkbox')).toHaveLength(categoryGroups[0].themes.length + 3)
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
  jest.mocked(createPuzzlePicker).mockReturnValueOnce(async () => underpromotionPuzzle)
  await render(<App />)
  await fireEvent.press(screen.getByRole('button', { name: 'Next puzzle' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c2, black pawn' }))
  await fireEvent.press(screen.getByRole('button', { name: 'c1, empty, legal move' }))
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

  expect(screen.getByText(/chesstrainer/)).toBeTruthy()
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
