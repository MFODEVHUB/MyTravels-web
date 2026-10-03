# Changelog

## 0.3.2 — 2026-10-03

- Le picto de synchronisation s'affiche aussi sur la carte quand la personne n'est pas encore connectée : un nuage avec une flèche, dont le tap ouvre une invitation à synchroniser (« Se connecter avec Google » et « En savoir plus »)
- La connexion se fait depuis cette fenêtre, qui reste ouverte pendant la connexion et affiche l'erreur et le conseil en cas d'échec ; une ancienne erreur ne réapparaît pas à la réouverture
- Plus de reconnexion silencieuse au chargement : elle ouvrait une fenêtre Google sans geste de l'utilisateur dans les navigateurs qui l'autorisent ; l'utilisateur voit « Reconnecter » et un tap suffit
- Un visiteur non connecté ne charge plus rien de Google tant qu'il ne clique pas sur « Se connecter »

## 0.3.1 — 2026-10-03

- La synchronisation Google Drive est ouverte à tous : la carte « Synchronisation » apparaît dans les Réglages sans réglage préalable (l'application Google est désormais en production)

## 0.3.0 — 2026-10-02

- Onglet « Stats » dans la barre de navigation, comme dans l'application Android : tant que la page n'existe pas sur le web, il ouvre une fenêtre qui présente l'application Android et annonce sa prochaine disponibilité sur Google Play
- Pastille « Application Android » sur la carte, avec un halo à l'apparition et une fenêtre de présentation : lien direct vers Google Play sur Android, QR code sur ordinateur, rien sur iPhone
- Affichage discret et plafonné : jamais à la première visite, après un vrai usage (3 pays marqués ou 2 minutes), au plus une fois par semaine et trois fois au total, avec « Plus tard » et « Ne plus afficher »
- Invisible tant que la fiche Google Play n'est pas publique (interrupteur `PLAY_STORE_PUBLIC`) ; aperçu possible avec `?promo=android`, `?promo=desktop` ou `?promo=ios`
- Les liens Google Play portent une provenance (carte, pastille, QR, stats) visible dans la Play Console, sans aucun traceur sur le site
- Le jeton Google expiré est supprimé du navigateur, conformément à la politique de confidentialité

## 0.2.2 — 2026-10-02

- Le compteur « N pays visités » en haut à gauche de la carte est retiré (la future page Stats prendra le relais)
- Bilan de synchronisation complet : pays, régions et villes visités, à visiter ou retirés, par exemple « Récupéré depuis votre Drive : 2 pays visités, 3 pays à visiter, 1 région visitée… », avec accords au singulier et au pluriel
- Le message de l'import « Fusionner » utilise le même décompte

## 0.2.1 — 2026-10-02

- Pastille de synchronisation redessinée en picto compact sur la carte : nuage vert coché (à jour), flèches animées (en cours), nuage barré (hors ligne), « Reconnecter » ou nuage d'alerte rouge (action nécessaire)
- Au tap sur le picto : mini-fenêtre avec l'état, la dernière synchronisation, « Synchroniser maintenant » ou « Reconnecter », et un accès aux réglages
- Point d'état sur l'onglet Réglages quand la synchronisation est en cours, hors ligne ou demande une action (absent quand tout est à jour)
- Message d'aide quand la connexion Google échoue ou que sa fenêtre est refermée : essayer un autre navigateur ou désactiver les extensions de confidentialité

## 0.2.0 — 2026-10-02

Synchronisation Google Drive (web ↔ web), masquée au public tant que l'application Google n'est pas publiée.

- Carte « Synchronisation » dans les Réglages : connexion Google, synchronisation à l'ouverture et après chaque modification, bouton « Synchroniser maintenant », déconnexion, suppression de la sauvegarde cloud
- Les données sont stockées dans le dossier caché de l'application sur le Drive de l'utilisateur (accès limité à ce seul dossier)
- Pastille d'état sur la carte (à jour, en cours, hors ligne, reconnexion) servant aussi de bouton « Reconnecter »
- Fusion entre appareils par date de modification pour chaque pays et région ; les remises à « Non visité » se propagent
- Import de sauvegarde : choix entre « Fusionner » et « Remplacer » ; « Effacer mes données » se propage aux appareils synchronisés
- Fichier de sauvegarde toujours en format v3, lisible par l'app Android (champ `updatedAt` facultatif ajouté)
- Activation pour les tests avec `?sync=1` dans l'adresse ; interrupteur `SYNC_PUBLIC` pour l'ouvrir à tous
- Page de test technique `spike.html` (non liée à l'application)

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
