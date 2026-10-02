/** Fiche Play Store de l'app Android (même URL que MapExporter.kt côté Android). */
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mfodevhub.mytravels'

/**
 * Lien Play avec une provenance (`medium` : carte, pastille, QR…). Le paramètre `referrer` apparaît dans la Play
 * Console, ce qui permet de mesurer ce qui amène des installations sans aucun traceur sur le site.
 */
export const playUrl = (medium: string): string =>
  `${PLAY_STORE_URL}&referrer=${encodeURIComponent(`utm_source=web&utm_medium=${medium}`)}`

/**
 * À passer à `true` une fois la fiche publique (vérifier que l'URL ne renvoie pas 404) : l'encart
 * affiche alors le lien actif au lieu de « Bientôt sur Google Play ».
 */
export const PLAY_STORE_PUBLIC = false

/**
 * Carte « Synchronisation » visible pour tout le monde. À passer à `true` une fois l'application publiée côté
 * Google (écran de consentement en production) : tant qu'il est en mode Test, seuls les utilisateurs test
 * peuvent se connecter. En attendant, on l'active pour soi avec `?sync=1` dans l'adresse (mémorisé).
 */
export const SYNC_PUBLIC = false

/** Identifiant client OAuth (type Web) du projet Google Cloud ; public par nature, pas un secret. */
export const GOOGLE_CLIENT_ID = '69838858611-idlecvf1pe2tl8sbcmivtmpftom4m0q1.apps.googleusercontent.com'
