# SkyDex ✈️ — le « Pokémon GO » des passionnés d'aviation

Radar de vols en direct + cartes à collectionner. Web app mobile-first (sans build).

## Lancer
```bash
cd Projet_Jeux_Avion
python3 -m http.server 8765      # puis ouvrir http://localhost:8765 (mode responsive mobile dans le navigateur)
```
Nécessite Internet (Leaflet, tuiles de carte, données ADS-B). Sans réseau ou si l'API échoue, le jeu bascule en **mode démo** (vols simulés).
Pour la géolocalisation sur téléphone il faut du HTTPS (sinon Paris par défaut).

## Boucle de jeu
1. **Radar** : avions réels (adsb.lol) qui bougent sur la carte, colorés par rareté. Recherche, filtres, traînée, fiche de vol (route, altitude, vitesse, cap…).
2. **Rencontre** : tap sur un avion → fiche → « Voir la carte » → carte qui tourne, effet holographique au toucher.
3. **Capture** : la carte se secoue 3× puis réussite/échec (taux selon la rareté, 3 essais). Animation vers la collection. Doublons → fragments 🧩.
4. **Packs** : missions du jour, paliers de collection, 100 fragments, pack gratuit toutes les 8 h, boutique (pièces ou € simulés). Probabilités affichées, aucun légendaire garanti, protection après 30 packs.
5. **Historiques** (Concorde, SR-71, DC-3…) : uniquement via Packs Historiques ou **apparitions spéciales** sur le radar (~1 toutes les 8-10 min).

## Structure
- `js/catalog.js` : modèles d'avions, raretés, silhouettes SVG
- `js/flights.js` : flux ADS-B + simulation
- `js/encounter.js` : capture · `js/screens.js` : collection / missions / boutique / ouverture de packs
- `js/packs.js` : packs & tirages · `js/state.js` : sauvegarde, niveaux, missions
- `tests/logic.test.mjs` : tests (node ou `jsc -m`)

## À brancher plus tard
Vrai paiement, comptes/serveur (anti-triche, vraie économie), type d'appareil fiable pour tous les vols, images réelles des avions.

## Lancer le jeu avec le vrai trafic aérien

```bash
python3 server.py        # puis ouvrir http://localhost:3000
```

`server.py` sert le jeu **et** relaie les données ADS-B d'adsb.lol (`/api/flights`, `/api/routes`).
Chaque joueur reçoit les avions autour de **sa** position (et de la zone qu'il regarde sur la carte).
Le relais met chaque zone en cache 5 s : 1 000 joueurs dans la même ville = 1 seule requête vers adsb.lol.

### Mise en ligne
- **Vercel** : déposer le dossier tel quel. Les fonctions `api/flights.js` et `api/routes.js` remplacent `server.py`.
- **Serveur / VPS** : `PORT=8080 python3 server.py` derrière un HTTPS (obligatoire pour la géolocalisation).
- Variables : `SKYDEX_CONTACT` (e-mail envoyé à adsb.lol dans le User-Agent), `SKYDEX_ADSB` (autre source compatible).
- Données : adsb.lol, licence ODbL — garder la mention « ADS-B : adsb.lol » visible sur la carte.
- Outils de test : ajouter `?dev=1` à l'URL (`?dev=0` pour les retirer).
