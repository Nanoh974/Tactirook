// SPDX-License-Identifier: MPL-2.0
import { useEffect } from 'react'
import { Platform } from 'react-native'

export function useWebFocusStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web') return
    const style = document.createElement('style')
    style.textContent = `
      :is(button, input, textarea, select, a[href], [role="button"], [role="checkbox"], [role="radio"], [role="link"]):focus-visible {
        outline: 2px solid #fff !important;
        outline-offset: 1px !important;
        box-shadow: 0 0 0 4px #132d43 !important;
      }
    `
    document.head.appendChild(style)
    return () => style.remove()
  }, [])
}
