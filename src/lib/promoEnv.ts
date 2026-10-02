import { PLAY_STORE_PUBLIC } from '../config'
import { detectDevice, type Device } from './device'

const DEVICES: Device[] = ['android', 'ios', 'desktop', 'other']

/**
 * Contexte de la promotion. `?promo=android|ios|desktop` force l'affichage (et l'appareil) pour pouvoir la tester
 * avant la publication de la fiche Play ; sans ce paramètre, seule la publication (`PLAY_STORE_PUBLIC`) l'active.
 */
export function promoEnv(): { device: Device; storePublic: boolean; forced: boolean } {
  let forced = false
  let device = detectDevice(navigator.userAgent, navigator.maxTouchPoints)
  try {
    const param = new URLSearchParams(location.search).get('promo')
    if (param !== null) {
      forced = true
      if (DEVICES.includes(param as Device)) device = param as Device
    }
  } catch {
    /* adresse illisible : comportement normal */
  }
  return { device, storePublic: PLAY_STORE_PUBLIC || forced, forced }
}
