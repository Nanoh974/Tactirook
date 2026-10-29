import { Linking, Pressable, Text, type StyleProp, type TextStyle } from 'react-native'
import { useLocalization } from './i18n/LocalizationProvider'
import { notify } from './notify'
import { styles } from './styles'

export function CreditLink({ url, label, textStyle }: { url: string; label: string; textStyle: StyleProp<TextStyle> }) {
  const { t } = useLocalization()
  function open() {
    Linking.openURL(url).catch((error: unknown) => {
      console.error('Unable to open link', error)
      notify(t('linkError'), t('tryAgain'))
    })
  }
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={open} style={styles.creditLink}>
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  )
}
