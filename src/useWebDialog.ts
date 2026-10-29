import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'

const focusable = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

export function useWebDialog(open: boolean, testID: string, initialID: string, modal: boolean, close: () => void) {
  const closeRef = useRef(close)
  useEffect(() => { closeRef.current = close }, [close])

  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return
    const dialog = document.querySelector(`[data-testid="${testID}"]`)
    if (!(dialog instanceof HTMLElement)) return
    const previous = document.activeElement
    const initial = dialog.querySelector(`[data-testid="${initialID}"]`)
    if (initial instanceof HTMLElement) initial.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (!dialog) return
      const target = document.activeElement
      const inside = target instanceof HTMLElement && dialog.contains(target)
      if (event.key === 'Escape' && (modal || inside)) {
        event.preventDefault()
        event.stopPropagation()
        closeRef.current()
        return
      }
      if (inside && target.getAttribute('role') === 'radio' &&
          ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
        const group = target.closest('[role="radiogroup"]')
        const radios = group ? Array.from(group.querySelectorAll<HTMLElement>('[role="radio"]')) : []
        const index = radios.indexOf(target)
        if (index >= 0 && radios.length > 1) {
          event.preventDefault()
          const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1
          const next = radios[(index + direction + radios.length) % radios.length]
          next.click()
          next.focus()
        }
        return
      }
      if (!modal || event.key !== 'Tab') return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(focusable)).filter((item) =>
        item.getAttribute('aria-disabled') !== 'true' && item.getClientRects().length > 0)
      if (!items.length) {
        event.preventDefault()
      } else if (!inside || (event.shiftKey && target === items[0]) || (!event.shiftKey && target === items[items.length - 1])) {
        event.preventDefault()
        items[event.shiftKey ? items.length - 1 : 0].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement && previous.isConnected && !previous.closest('[aria-hidden="true"]')) previous.focus()
    }
  }, [open, testID, initialID, modal])
}
