# Le trajet d'un message

Animation de 15 secondes en motion design qui suit un message envoyé depuis un téléphone à Paris jusqu'à ses destinataires à Montréal, Lyon, Dakar et São Paulo. Elle explique, en vulgarisant, ce qui se passe dans les télécoms.

| Étape | Temps | Ce qu'on voit |
| --- | --- | --- |
| 01 · Tu appuies sur Envoyer | 0 – 1,8 s | Le message est tapé puis envoyé. |
| 02 · Tout devient 0 et 1 | 1,8 – 4 s | Chaque lettre devient 8 bits (S = 01010011), puis le message est découpé en 4 paquets adressés. |
| 03 · Ondes radio | 4 – 5,35 s | Les paquets partent en ondes 5G (3,5 GHz) vers l'antenne-relais. |
| 04 · Fibre optique | 5,35 – 6,9 s | La lumière rebondit dans un cœur de verre de 0,125 mm, à ≈ 200 000 km/s. |
| 05 · Routeurs et câbles sous-marins | 6,9 – 9,2 s | Les paquets prennent deux routes : les câbles Dunant et Amitié, sous l'Atlantique. |
| 06 · Le serveur relaie | 9,2 – 10,9 s | Le data center d'Ashburn (Virginie) copie le message chiffré pour chaque destinataire. |
| 07 · Réception | 10,9 – 13,2 s | Les copies arrivent ; sur le téléphone, les paquets reçus dans le désordre sont remis en ordre. |
| Bilan | 13,2 – 15 s | 0,21 s en temps réel, ≈ 14 700 km jusqu'à São Paulo. |

Un compteur « temps réel écoulé » tourne pendant toute l'animation, qui est jouée environ 60 fois plus lentement que la réalité.

## Fichiers

- `index.html` : l'animation interactive (canvas, 60 i/s), avec lecture/pause, barre de défilement et chapitres cliquables. Elle s'ouvre directement dans un navigateur.
- `le-trajet-d-un-message.mp4` : l'export vidéo en 1920 × 1080, 60 i/s, 15 s.
- `export/render-video.cjs` : régénère la vidéo image par image à partir de `index.html`.

## Régénérer la vidéo

Il faut Node.js, Playwright (Chromium) et ffmpeg :

```sh
FFMPEG=/chemin/vers/ffmpeg node export/render-video.cjs le-trajet-d-un-message.mp4
# options : --fps 30, --width 1280, --sheet planche.png (planche contact au lieu de la vidéo)
```

La carte du globe est générée à partir de Natural Earth (domaine public, via `world-atlas`) et intégrée dans la page.
