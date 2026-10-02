import type { AuthProvider } from './googleAuth'
import type { DriveClient } from './drive'

/**
 * Faux Google pour développer et vérifier l'interface sans compte : actif seulement en dev, avec `?mocksync`.
 * Le "Drive" est partagé via localStorage : deux onglets de la même origine jouent deux appareils.
 */
const CLOUD_KEY = 'mytravels-mock-drive'
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class MockAuth implements AuthProvider {
  private valid = false
  hasToken() {
    return this.valid
  }
  token() {
    return 'mock-token'
  }
  async signIn(interactive: boolean) {
    await delay(400)
    const params = new URLSearchParams(location.search)
    if (params.has('mockfail')) throw new Error('mock auth failure')
    // Reproduit Safari : sans geste de l'utilisateur, la fenêtre Google est bloquée.
    if (params.has('mocksilentfail') && !interactive) throw new Error('popup blocked')
    this.valid = true
  }
  forget() {
    this.valid = false
  }
}

export class MockDrive implements DriveClient {
  async find() {
    await delay(200)
    return localStorage.getItem(CLOUD_KEY) === null ? null : 'mock-file'
  }
  async read() {
    return localStorage.getItem(CLOUD_KEY) ?? ''
  }
  async create(content: string) {
    localStorage.setItem(CLOUD_KEY, content)
    return 'mock-file'
  }
  async update(_id: string, content: string) {
    localStorage.setItem(CLOUD_KEY, content)
  }
  async remove() {
    localStorage.removeItem(CLOUD_KEY)
  }
}
