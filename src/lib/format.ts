import type { Lang } from './types'

/** Date et heure courtes, dans la langue de l'interface (ex. « 02/10/2026 11:59 »). */
export const formatDateTime = (ms: number, lang: Lang): string =>
  new Intl.DateTimeFormat(lang, { dateStyle: 'short', timeStyle: 'short' }).format(ms)
