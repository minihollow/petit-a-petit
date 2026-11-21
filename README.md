# Petit à petit

**Apprendre le français petit à petit, avec l'aide du turc.**
Application web gratuite, sans compte, qui fonctionne hors ligne, pour aller du niveau A1 au niveau A2
(le niveau demandé pour une première carte de séjour pluriannuelle depuis 2026).

> *Petit à petit, l'oiseau fait son nid.* · Damlaya damlaya göl olur.

## Le parcours

- **12 unités tirées de la vie en France** : se présenter, la famille, faire les courses, le logement, la santé,
  les démarches… Chaque jour, un seul bouton, « Continuer », ouvre la leçon suivante.
- **6 leçons par unité**, dans le même ordre : les mots du thème (découverts puis tapés de mémoire), la règle de
  grammaire (carte de règle et exercices), les verbes (tableaux à remplir), un dialogue à écouter puis à comprendre
  (questions, texte et traduction à la fin), un texte à écrire (phrases utiles, modèle, liste de vérification,
  lecture à voix haute, correction par Coco sur l'ordinateur) et un bilan.
- **Révisions espacées** (FSRS) : tout ce qui est appris dans les leçons revient au bon moment dans « Réviser ».
- Les unités 1 à 3 sont écrites ; les suivantes arrivent au fil des semaines. Contenu dans
  [`web/src/data/course.json`](web/src/data/course.json).

## L'aide en turc

Trois modes, comme dans Passeport civique : **Türkçe** (interface et explications en turc, exemples traduits),
**Français + aide** (en français, le turc à la demande avec les boutons TR ou en touchant une explication) et
**Français** (tout en français, comme le jour du test). Un mot touché est toujours lu et traduit.

## La bibliothèque

- **Conjugaison de 198 verbes** sur 8 temps, tableaux colorés (radical, terminaison prononcée, lettres muettes),
  prononciation de chaque forme en lettres turques (*parlons = parloⁿ*) ou en API, formule de chaque temps.
- **Vocabulaire** : 585 mots en 26 thèmes, avec leur article et leur sens en turc ; jeux « le ou la ? », association
  et écoute ; **règles du genre** par terminaison avec leurs pourcentages réels (‑tion : 99,8 % féminin sur 426 noms).
- **Grammaire** : 13 chapitres A1-A2 (ce qu'il faut savoir, règles numérotées, exemples annotés, exceptions,
  comparaison avec le turc) et 77 exercices.
- **Prononciation et dictée** : lettres françaises en lettres turques, règles, mots turcs venus du français,
  écoute fine et dictées.
- **Mot cliquable** : lexique de 21 000 formes tiré de Lexique (sens en turc, nature, genre, prononciation).

## Et aussi

- **Coco, tuteur IA (ordinateur uniquement)** : explique en turc les erreurs et corrige les textes écrits. Il tourne
  avec [Ollama](https://ollama.com) sur l'ordinateur : rien ne part sur Internet. À activer dans Réglages, qui
  expliquent comment autoriser le site (`setx OLLAMA_ORIGINS "https://minihollow.github.io"`).
- **Progrès** : jours de suite, minutes, calendrier d'étude, unités, et les textes déjà écrits.
- **Synchronisation** facultative entre téléphone et ordinateur par un petit serveur à la maison (voir [`server/`](server/)).
- Sauvegarde et import d'un fichier de progression.

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
- `web/src/lib/course.js`, `web/src/data/course.json` : le parcours (unités, leçons, progression).
- `web/src/lib/srs.js`, `plan.js` : répétition espacée (ts-fsrs) et révisions.
- `web/src/lib/db.js`, `sync.js` : stockage (journal d'événements en ajout seul) et synchronisation.
- `scripts/build-verbs.mjs` : génère `web/src/data/verbs.json` depuis Lexique 3.83 et `scripts/verbs-meta.json`
  (liste des verbes et sens en turc). `scripts/check-conj.mjs` affiche les tableaux générés pour vérification.
- `scripts/build-words.mjs` : génère `web/src/data/words.json` (thèmes, genre, pluriels, féminins, règles du genre) et
  `web/public/lexicon.json` (mot cliquable) depuis Lexique et `scripts/words-themes.json`, `scripts/function-words.json`.

```sh
# Lexique383.zip depuis http://www.lexique.org, puis :
node scripts/build-verbs.mjs chemin/vers/Lexique383.tsv
node scripts/build-words.mjs chemin/vers/Lexique383.tsv
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
