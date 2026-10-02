import type { Device } from './device'

/** Règles de la pastille « application Android » : discrète, plafonnée, jamais à la première visite. */
export const PROMO_RULES = {
  /** Nombre de visites avant d'oser proposer quoi que ce soit. */
  minVisits: 2,
  /** Un usage "réel" : au moins ce nombre de pays marqués… */
  minCountries: 3,
  /** …ou au moins cette durée passée dans la session (secondes). */
  minSessionSeconds: 120,
  /** Deux visites séparées d'au moins ce délai comptent comme deux visites. */
  visitGapMs: 30 * 60_000,
  /** Plafond d'affichages au total, et délai minimal entre deux affichages. */
  maxShown: 3,
  minGapMs: 7 * 24 * 3600_000,
} as const

export interface PromoState {
  visits: number
  lastVisitAt: number
  shown: number
  lastShownAt: number
  /** « Ne plus afficher » */
  dismissed: boolean
}

export const emptyPromo = (): PromoState => ({ visits: 0, lastVisitAt: 0, shown: 0, lastShownAt: 0, dismissed: false })

/** Compte une visite si la précédente est assez ancienne (un rechargement de page n'en fait pas une nouvelle). */
export function registerVisit(state: PromoState, now: number): PromoState {
  if (state.visits > 0 && now - state.lastVisitAt < PROMO_RULES.visitGapMs) return { ...state, lastVisitAt: now }
  return { ...state, visits: state.visits + 1, lastVisitAt: now }
}

export interface PromoContext {
  now: number
  device: Device
  /** La fiche Play est publique (sinon on n'a rien à proposer). */
  storePublic: boolean
  countriesMarked: number
  sessionSeconds: number
}

/** Android : lien direct ; ordinateur : QR code. iPhone et autres : rien à proposer. */
export const promoDevices: readonly Device[] = ['android', 'desktop']

export function shouldShowPromo(state: PromoState, ctx: PromoContext): boolean {
  if (!ctx.storePublic || state.dismissed) return false
  if (!promoDevices.includes(ctx.device)) return false
  if (state.visits < PROMO_RULES.minVisits) return false
  if (state.shown >= PROMO_RULES.maxShown) return false
  if (state.shown > 0 && ctx.now - state.lastShownAt < PROMO_RULES.minGapMs) return false
  return ctx.countriesMarked >= PROMO_RULES.minCountries || ctx.sessionSeconds >= PROMO_RULES.minSessionSeconds
}

/** À appeler quand la pastille apparaît : compte l'affichage même si l'utilisateur l'ignore. */
export const recordShown = (state: PromoState, now: number): PromoState => ({
  ...state,
  shown: state.shown + 1,
  lastShownAt: now,
})

const KEY = 'mytravels-promo'

export function loadPromo(): PromoState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<PromoState> | null
    if (!raw) return emptyPromo()
    return {
      visits: Number(raw.visits) || 0,
      lastVisitAt: Number(raw.lastVisitAt) || 0,
      shown: Number(raw.shown) || 0,
      lastShownAt: Number(raw.lastShownAt) || 0,
      dismissed: raw.dismissed === true,
    }
  } catch {
    return emptyPromo()
  }
}

export function savePromo(state: PromoState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* stockage indisponible : les plafonds ne seront pas mémorisés */
  }
}
