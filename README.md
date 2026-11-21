# Petit à petit

**Apprendre le français petit à petit, avec l'aide du turc.**
Application web gratuite, sans compte, qui fonctionne hors ligne. Interface en français, aide en turc sous chaque texte.

> *Petit à petit, l'oiseau fait son nid.* · Damlaya damlaya göl olur.

## Ce que fait la version 0.1

- **Conjugaison de 198 verbes**, du plus fréquent au plus rare, sur 8 temps : présent, passé composé, futur proche,
  imparfait, impératif, futur simple, conditionnel, subjonctif.
- **Tableaux colorés** façon Bescherelle : radical, terminaison prononcée, lettres muettes en gris
  (*ils parlent* : le *-ent* ne se prononce pas), accord avec *être*, verbes pronominaux.
- **Prononciation de chaque forme**, en lettres turques (*parlons = parloⁿ*) ou en API, et lecture à voix haute
  (voix naturelle Piper téléchargée une fois, ou voix du téléphone). Les formes qui se prononcent pareil portent la même lettre.
- **Formule de chaque temps** et équivalent turc (passé composé ≈ -di, imparfait ≈ -iyordu…).
- **Série du jour** : révisions (répétition espacée FSRS), puis nouveaux tableaux à découvrir puis à remplir de mémoire,
  avec barre d'accents et correction détaillée (radical juste et terminaison fausse, accent, accord, auxiliaire).
- **Synchronisation** facultative entre téléphone et ordinateur par un petit serveur à la maison (voir [`server/`](server/)).
- Sauvegarde et import d'un fichier de progression.

À venir : cartes de règles de grammaire, vocabulaire par thèmes (cartes et jeux), prononciation et dictées, tuteur IA.

## Utiliser

Version web : **https://minihollow.github.io/petit-a-petit/**. Pour l'installer comme une application :
menu du navigateur, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».

La progression reste dans l'appareil (IndexedDB). Pour la partager entre plusieurs appareils, installer le serveur de
synchronisation sur une machine de la maison : [`server/README.md`](server/README.md).

## Développement

Node.js 18 ou plus.

```sh
cd web
npm install
npm run dev      # http://localhost:5173
npm run build    # -> ../site (publié par .github/workflows/pages.yml)
```

- `web/src/lib/conj.js` : temps, lignes d'un tableau (élision, pronominaux, accord), coloration, correction.
- `web/src/lib/phon.js` : notation phonologique de Lexique vers API et vers lettres turques.
- `web/src/lib/srs.js`, `plan.js` : répétition espacée (ts-fsrs) et série du jour.
- `web/src/lib/db.js`, `sync.js` : stockage (journal d'événements en ajout seul) et synchronisation.
- `scripts/build-verbs.mjs` : génère `web/src/data/verbs.json` depuis Lexique 3.83 et `scripts/verbs-meta.json`
  (liste des verbes et sens en turc). `scripts/check-conj.mjs` affiche les tableaux générés pour vérification.

```sh
# Lexique383.zip depuis http://www.lexique.org, puis :
node scripts/build-verbs.mjs chemin/vers/Lexique383.tsv
node scripts/check-conj.mjs parler aller souvenir
```

## Licences

- Code : [MIT](LICENSE).
- Données (`web/src/data/`) : CC BY-SA 4.0, dérivées de [Lexique 3.83](http://www.lexique.org) (New, Pallier et al.).
  Détails : [`web/src/data/LICENSE.md`](web/src/data/LICENSE.md).
- Voix française « Siwis » (Piper) : CC BY 4.0. Police : Lexend, Archivo (SIL OFL).
- D'après [Passeport civique](https://github.com/minihollow/passeport-civique).

---

### Türkçe

Petit à petit, Türkçe konuşanlar için ücretsiz bir Fransızca uygulaması: 198 fiilin 8 zamanda çekimi, her formun okunuşu
(Türk harfleriyle), sesli okuma, formüller ve günlük tekrar serisi. İlerleme cihazda kalır; istenirse evdeki bir sunucu
üzerinden telefon ve bilgisayar arasında eşitlenir.
