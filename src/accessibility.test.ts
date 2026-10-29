// SPDX-License-Identifier: MPL-2.0
import { boardPalettes } from './boardPalettes'
import { styles, darkStyles } from './styles'

function contrast(foreground: string, background: string) {
  function luminance(color: string) {
    const hex = color.slice(1)
    const components = (hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex).match(/.{2}/g)
    if (!components || components.length !== 3) throw new Error(`Invalid color: ${color}`)
    return components.map((part) => {
      const channel = parseInt(part, 16) / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  }
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

test('key text remains at least 4.5:1 in light and dark states', () => {
  for (const theme of [styles, darkStyles]) {
    const pairs = [
      [theme.settingsDescription.color, theme.trainingMenu.backgroundColor],
      [theme.languageOptionText.color, theme.languageOption.backgroundColor],
      [theme.languageOptionText.color, theme.categoryActive.backgroundColor],
      [theme.categorySubtitle.color, theme.settingOption.backgroundColor],
      [theme.categorySubtitle.color, theme.categoryActive.backgroundColor],
      [theme.rating.color, theme.rating.backgroundColor],
      [theme.mobileFeedbackDescription.color, theme.app.backgroundColor],
      [theme.feedbackDescription.color, theme.feedback.backgroundColor],
      [theme.feedbackDescription.color, theme.feedbackWrong.backgroundColor],
      [theme.feedbackDescription.color, theme.feedbackSuccess.backgroundColor],
      [theme.nextButtonText.color, theme.nextButton.backgroundColor],
      [theme.themeGroupTitle.color, theme.trainingMenu.backgroundColor],
    ]
    for (const [foreground, background] of pairs) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  }
})

test('control borders and board indicators remain distinguishable', () => {
  for (const theme of [styles, darkStyles]) {
    const option = theme.languageOption
    expect(contrast(option.borderColor, option.backgroundColor)).toBeGreaterThanOrEqual(3)
    expect(contrast(theme.categoryActive.borderColor, theme.categoryActive.backgroundColor)).toBeGreaterThanOrEqual(3)
  }
  for (const palette of Object.values(boardPalettes)) {
    for (const color of [palette.light, palette.dark, '#e8d79b', '#bca568', '#e3c56d']) {
      expect(contrast('#132d43', color)).toBeGreaterThanOrEqual(3)
      expect(contrast(palette.coordinate, color)).toBeGreaterThanOrEqual(4.5)
    }
  }
})
