import { GOOGLE_CLIENT_ID } from '../config'

/** Accès limité au dossier caché de l'application : aucun autre fichier du Drive n'est visible. */
const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const TOKEN_KEY = 'mytravels-sync-token'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
/** Marge avant l'expiration réelle du jeton. */
const SKEW_MS = 60_000

export class AuthError extends Error {
  constructor(
    message: string,
    /** Type d'erreur Google (popup_closed, popup_failed_to_open…) ou "script" / "timeout". */
    readonly type: string,
  ) {
    super(message)
  }
}

export interface AuthProvider {
  /** Jeton encore valide ? */
  hasToken(): boolean
  token(): string
  /** `interactive` : l'appel vient d'un geste de l'utilisateur (sinon le navigateur peut bloquer la fenêtre). */
  signIn(interactive: boolean): Promise<void>
  /** Oublie le jeton local (n'efface rien chez Google). */
  forget(): void
}

interface TokenResponse {
  access_token?: string
  expires_in?: number | string
  scope?: string
  error?: string
  error_description?: string
}
interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string
        scope: string
        callback: (r: TokenResponse) => void
        error_callback: (e: { type: string; message?: string }) => void
      }): TokenClient
    }
  }
}

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if ((window as unknown as { google?: GoogleGlobal }).google?.accounts) return Promise.resolve()
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = GIS_SRC
    el.async = true
    el.onload = () => resolve()
    el.onerror = () => {
      scriptPromise = null
      reject(new AuthError('Script Google indisponible', 'script'))
    }
    document.head.appendChild(el)
  })
  return scriptPromise
}

export class GoogleAuth implements AuthProvider {
  private accessToken: string | null = null
  private expiresAt = 0
  private client: TokenClient | null = null
  private pending: { resolve: () => void; reject: (e: AuthError) => void } | null = null

  constructor() {
    // Le jeton (valide environ 1 h, limité au dossier de l'application) survit à un rechargement de page.
    try {
      const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as { token: string; expiresAt: number } | null
      if (saved && saved.expiresAt > Date.now() + SKEW_MS) {
        this.accessToken = saved.token
        this.expiresAt = saved.expiresAt
      } else if (saved) {
        // Jeton expiré : on ne le garde pas dans le navigateur (voir la politique de confidentialité).
        localStorage.removeItem(TOKEN_KEY)
      }
    } catch {
      /* stockage indisponible ou corrompu : on repart sans jeton */
    }
  }

  hasToken() {
    return !!this.accessToken && Date.now() < this.expiresAt - SKEW_MS
  }

  token() {
    if (!this.accessToken) throw new AuthError('Pas de jeton', 'no-token')
    return this.accessToken
  }

  async signIn(interactive: boolean): Promise<void> {
    await loadScript()
    const google = (window as unknown as { google: GoogleGlobal }).google
    this.client ??= google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => this.onToken(r),
      error_callback: (e) => this.settle(new AuthError(e.message ?? e.type, e.type)),
    })
    return new Promise<void>((resolve, reject) => {
      this.pending = { resolve, reject }
      // Sans geste, la fenêtre est souvent bloquée : on ne laisse pas l'attente se prolonger.
      if (!interactive) setTimeout(() => this.settle(new AuthError('Délai dépassé', 'timeout')), 15_000)
      this.client!.requestAccessToken({ prompt: '' })
    })
  }

  forget() {
    this.accessToken = null
    this.expiresAt = 0
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* rien à faire */
    }
  }

  private onToken(r: TokenResponse) {
    if (r.error || !r.access_token) return this.settle(new AuthError(r.error_description ?? r.error ?? 'Refusé', r.error ?? 'denied'))
    if (!String(r.scope ?? '').includes('drive.appdata')) return this.settle(new AuthError('Autorisation Drive refusée', 'scope'))
    this.accessToken = r.access_token
    this.expiresAt = Date.now() + Number(r.expires_in ?? 3600) * 1000
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: this.accessToken, expiresAt: this.expiresAt }))
    } catch {
      /* le jeton reste en mémoire pour cette session */
    }
    this.settle()
  }

  private settle(error?: AuthError) {
    const p = this.pending
    this.pending = null
    if (!p) return
    if (error) p.reject(error)
    else p.resolve()
  }
}
