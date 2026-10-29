// SPDX-License-Identifier: MPL-2.0
import { useEffect, useState } from 'react'
import { AccessibilityInfo, Platform } from 'react-native'

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true)

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window.matchMedia !== 'function') return
      const query = window.matchMedia('(prefers-reduced-motion: reduce)')
      let active = true
      let changed = false
      const update = (event: MediaQueryListEvent) => { changed = true; setReduced(event.matches) }
      query.addEventListener('change', update)
      Promise.resolve().then(() => { if (active && !changed) setReduced(query.matches) })
      return () => { active = false; query.removeEventListener('change', update) }
    }

    let active = true
    let changed = false
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      changed = true
      setReduced(value)
    })
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active && !changed) setReduced(value)
    }).catch((error: unknown) => {
      console.error('Unable to read reduced motion preference', error)
    })
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  return reduced
}
