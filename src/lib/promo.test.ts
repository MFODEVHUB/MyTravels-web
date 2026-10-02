import { describe, expect, it } from 'vitest'
import { emptyPromo, PROMO_RULES, recordShown, registerVisit, shouldShowPromo, type PromoContext, type PromoState } from './promo'

const DAY = 24 * 3600_000
const ready = (over: Partial<PromoState> = {}): PromoState => ({ ...emptyPromo(), visits: 3, ...over })
const ctx = (over: Partial<PromoContext> = {}): PromoContext => ({
  now: 100 * DAY,
  device: 'android',
  storePublic: true,
  countriesMarked: 5,
  sessionSeconds: 0,
  ...over,
})

describe('registerVisit', () => {
  it('compte une visite, mais pas un rechargement rapide', () => {
    let s = registerVisit(emptyPromo(), 1000)
    expect(s.visits).toBe(1)
    s = registerVisit(s, 1000 + 5 * 60_000)
    expect(s.visits).toBe(1)
    s = registerVisit(s, 1000 + PROMO_RULES.visitGapMs + 60_000 + 5 * 60_000)
    expect(s.visits).toBe(2)
  })
})

describe('shouldShowPromo', () => {
  it('ne montre rien tant que la fiche Play n’est pas publique', () => {
    expect(shouldShowPromo(ready(), ctx({ storePublic: false }))).toBe(false)
  })
  it('ne montre rien à la première visite', () => {
    expect(shouldShowPromo(ready({ visits: 1 }), ctx())).toBe(false)
  })
  it('exige un vrai usage : assez de pays marqués ou assez de temps', () => {
    expect(shouldShowPromo(ready(), ctx({ countriesMarked: 1, sessionSeconds: 10 }))).toBe(false)
    expect(shouldShowPromo(ready(), ctx({ countriesMarked: PROMO_RULES.minCountries, sessionSeconds: 0 }))).toBe(true)
    expect(shouldShowPromo(ready(), ctx({ countriesMarked: 0, sessionSeconds: PROMO_RULES.minSessionSeconds }))).toBe(true)
  })
  it('ne cible que Android et ordinateur', () => {
    expect(shouldShowPromo(ready(), ctx({ device: 'desktop' }))).toBe(true)
    expect(shouldShowPromo(ready(), ctx({ device: 'ios' }))).toBe(false)
    expect(shouldShowPromo(ready(), ctx({ device: 'other' }))).toBe(false)
  })
  it('respecte « ne plus afficher »', () => {
    expect(shouldShowPromo(ready({ dismissed: true }), ctx())).toBe(false)
  })
  it('espace les affichages d’au moins sept jours et les plafonne à trois', () => {
    const now = 100 * DAY
    const once = recordShown(ready(), now - 2 * DAY)
    expect(shouldShowPromo(once, ctx({ now }))).toBe(false)
    expect(shouldShowPromo(once, ctx({ now: now + 6 * DAY }))).toBe(true)
    const three = ready({ shown: PROMO_RULES.maxShown, lastShownAt: 1 })
    expect(shouldShowPromo(three, ctx({ now: now + 365 * DAY }))).toBe(false)
  })
})
