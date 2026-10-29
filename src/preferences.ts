// SPDX-License-Identifier: MPL-2.0
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function readPreference<T extends string>(key: string, isValid: (value: string) => value is T): Promise<T | null> {
  const value = await AsyncStorage.getItem(key)
  if (value !== null && !isValid(value)) throw new Error(`Invalid saved preference: ${key}`)
  return value
}

export function createPreferenceWriter() {
  let pending: Promise<void> = Promise.resolve()
  return (key: string, value: string) => {
    const write = pending.then(() => AsyncStorage.setItem(key, value))
    pending = write.then(() => undefined, () => undefined)
    return write
  }
}
