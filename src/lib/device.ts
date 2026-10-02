export type Device = 'android' | 'ios' | 'desktop' | 'other'

/**
 * Famille d'appareil d'après le user agent. Un iPad récent se présente comme un Mac : on le reconnaît à son écran
 * tactile. Sert uniquement à choisir quelle proposition afficher (jamais de pistage).
 */
export function detectDevice(ua: string, maxTouchPoints = 0): Device {
  if (/Android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1)) return 'ios'
  if (/Windows|Macintosh|Linux|CrOS|X11/i.test(ua)) return 'desktop'
  return 'other'
}
