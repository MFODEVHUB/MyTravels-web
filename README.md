# MyTravels Web

![version](https://img.shields.io/badge/version-0.3.2-5c6bc0)

🇫🇷 [Français](#français) · 🇬🇧 [English](#english)

---

## Français

Version web (PWA) de **MyTravels**, l'application Android de suivi de voyages. Elle s'adresse à celles et ceux qui n'ont pas d'appareil Android : navigateur de bureau, iPhone, tablette.

**Gratuite, sans compte, sans serveur** : les données restent dans le navigateur (IndexedDB) et s'échangent avec l'app Android via le même fichier de sauvegarde JSON.

### Fonctionnalités

- Carte du monde interactive (zoom, déplacement, pincement) avec noms de pays, même projection que l'app Android
- Vue « Régions » : 50 États américains, 14 régions grecques, 16 régions marocaines (statut propre à chaque région)
- Statuts Visité / À visiter / Non visité, avec date de visite
- Liste de 257 pays, îles et territoires, avec recherche sans accents et filtres
- Import / export de sauvegarde, compatible avec l'app Android (format v1 à v3), avec fusion ou remplacement
- Synchronisation facultative entre appareils via Google Drive (dossier privé de l'application)
- FR / EN, thème clair / sombre, installable et utilisable hors ligne

À venir : stats et badges, villes, modes de partage, synchronisation avec l'app Android. Le détail de la couverture cartographique (îles intégrées à leur pays parent, niveaux de détail) évolue avec les lots.

### Développement

```bash
npm install
npm run dev      # serveur local
npm test         # tests unitaires
npm run check    # types Svelte / TypeScript
npm run build    # build de production (dist/)
```

Stack : Vite, Svelte 5, TypeScript, d3-geo (carte Canvas), vite-plugin-pwa.

Les données pays et la carte proviennent de l'app Android. Pour les régénérer : `node scripts/generate-data.mjs ../MyTravels`.

---

## English

Web (PWA) version of **MyTravels**, the Android travel tracker, for people without an Android device: desktop browser, iPhone, tablet.

**Free, no account, no server**: data stays in the browser (IndexedDB) and moves to and from the Android app through the same JSON backup file.

### Features

- Interactive world map (zoom, pan, pinch) with country names, same projection as the Android app
- "Regions" view: 50 US states, 14 Greek and 16 Moroccan regions (each region has its own status)
- Visited / Want to go / Not visited statuses, with visit date
- List of 257 countries, islands and territories, with accent-insensitive search and filters
- Backup import / export, compatible with the Android app (formats v1 to v3), with merge or replace
- Optional sync between devices through Google Drive (the app's private folder)
- FR / EN, light / dark theme, installable and usable offline

Coming next: stats and badges, cities, sharing modes, sync with the Android app. Map coverage details (islands merged into their parent country, levels of detail) will evolve with each batch.

### Development

```bash
npm install
npm run dev      # local server
npm test         # unit tests
npm run check    # Svelte / TypeScript checks
npm run build    # production build (dist/)
```

Stack: Vite, Svelte 5, TypeScript, d3-geo (Canvas map), vite-plugin-pwa.

Country data and the map come from the Android app. To regenerate them: `node scripts/generate-data.mjs ../MyTravels`.
