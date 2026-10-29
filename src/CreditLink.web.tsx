import { Text, type StyleProp, type TextStyle } from 'react-native'

export function CreditLink({ url, label, textStyle }: { url: string; label: string; textStyle: StyleProp<TextStyle> }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}>
      <Text style={textStyle}>{label}</Text>
    </a>
  )
}
