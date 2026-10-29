import { english } from './en'
import { french } from './fr'
import { spanish } from './es'
import { japanese } from './ja'
import { chinese } from './zh'
import { hindi } from './hi'
import { italian } from './it'
import type { Messages } from './en'

export { english }
export type { MessageKey } from './en'

export const messages = { en: english, fr: french, es: spanish, ja: japanese, zh: chinese, hi: hindi, it: italian } satisfies Record<string, Messages>
