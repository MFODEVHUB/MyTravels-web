# Changelog

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
