# Changelog

## 0.1.4 — 2026-10-02

- Numéro de version affiché dans les Réglages (section « À propos »), lu automatiquement depuis `package.json`

## 0.1.3 — 2026-10-02

Correctif mobile : toucher un pays ou une région n'ouvrait rien sur navigateur mobile.

- La fiche ne se referme plus toute seule : le « clic fantôme » envoyé par le navigateur mobile après un tap tombait sur son fond et la fermait aussitôt
- Tolérance plus large au tremblement du doigt lors d'un tap (12 px au lieu de 6 px)
- Capture du pointeur sécurisée : un refus du navigateur n'interrompt plus le geste

## 0.1.2 — 2026-10-02

- Encart « MyTravels pour Android » en haut de la liste des pays (fermable) et des réglages, avec un lien vers Google Play activable dès que la fiche est publique (« Bientôt sur Google Play » d'ici là)
- Correction de l'icône de l'application web (favicon, icône installable, icône Apple) : elle utilise désormais le vrai logo de MyTravels

## 0.1.1 — 2026-10-02

Correctif de déploiement : le site affichait un écran blanc sur GitHub Pages.

- Chemin de base configurable (`BASE_PATH`) : le site fonctionne sous `/MyTravels-web/`, y compris la carte, l'installation PWA et le mode hors ligne
- Déploiement automatique par GitHub Actions (tests, build, publication) à chaque push sur `main`

## 0.1 — 2026-10-01

Première version de MyTravels Web (PWA gratuite, sans compte ni serveur).

- Carte du monde interactive (zoom, déplacement, pincement) avec noms de pays, même projection que l'app Android
- Vue « Régions » : 50 États américains, 14 régions grecques, 16 régions marocaines, avec statut propre à chaque région
- Statuts Visité / À visiter / Non visité pour 257 pays, îles et territoires, avec date de visite
- Liste avec recherche sans accents et filtres par statut
- Import / export de sauvegarde JSON compatible avec l'app Android (formats v1 à v3), villes et régions conservées
- FR / EN, thème clair / sombre, installable et utilisable hors ligne
- Données stockées dans le navigateur (IndexedDB), demande de protection contre la purge du stockage

Limites connues : Svalbard, Açores, Canaries, etc. restent intégrés à leur pays parent sur la carte ; pas de niveau de détail fin au zoom ; stats, badges, villes et partage à venir.
