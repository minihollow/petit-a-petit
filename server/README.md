# Serveur de synchronisation (Raspberry Pi)

Garde la progression (les réponses, en ajout seul) et la partage entre le téléphone et l'ordinateur.
Node.js 18 ou plus, aucune dépendance. Le service n'écoute que `127.0.0.1` ; `tailscale serve` le publie
en HTTPS sur le tailnet uniquement (pas sur Internet).

Pourquoi Tailscale sur chaque appareil : l'application est servie en HTTPS (GitHub Pages), donc le navigateur
refuse d'appeler une adresse `http://192.168…` (contenu mixte). Il faut une adresse HTTPS avec un vrai certificat :
celle de Tailscale (`https://<pi>.<tailnet>.ts.net`), qui ne se résout que sur les appareils connectés au tailnet.

## 1. Installation (Raspberry Pi OS)

```sh
node -v                      # 18 ou plus ; sinon : sudo apt install nodejs
sudo useradd --system --home /var/lib/petit-a-petit-sync --shell /usr/sbin/nologin petitapetit
sudo mkdir -p /opt/petit-a-petit-sync /var/lib/petit-a-petit-sync
sudo cp sync-server.mjs pair-link.mjs /opt/petit-a-petit-sync/
sudo chown petitapetit: /var/lib/petit-a-petit-sync

sudo tee /etc/petit-a-petit-sync.env > /dev/null <<EOF
SYNC_TOKEN=$(openssl rand -hex 24)
STATUS_TOKEN=$(openssl rand -hex 24)
ALLOWED_ORIGINS=https://minihollow.github.io
DATA_DIR=/var/lib/petit-a-petit-sync
EOF
sudo chmod 600 /etc/petit-a-petit-sync.env

sudo cp petit-a-petit-sync.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now petit-a-petit-sync
curl http://127.0.0.1:8787/health   # {"ok":true}
```

## 2. Publication HTTPS sur le tailnet

1. Console d'administration Tailscale, page **DNS** : activer **MagicDNS** et **HTTPS Certificates**.
2. Sur la Pi :

```sh
sudo tailscale serve --bg 8787
tailscale serve status        # affiche https://<pi>.<tailnet>.ts.net
```

La configuration survit aux redémarrages. Documentation : <https://tailscale.com/docs/reference/tailscale-cli/serve>.

## 3. Associer les appareils

Tailscale doit être installé et connecté sur chaque appareil (téléphone **et** ordinateur).

```sh
TOKEN=$(sudo grep '^SYNC_TOKEN=' /etc/petit-a-petit-sync.env | cut -d= -f2)
node /opt/petit-a-petit-sync/pair-link.mjs https://<pi>.<tailnet>.ts.net "$TOKEN"
```

Ouvrir le lien affiché une fois sur chaque appareil (par exemple envoyé par message). Autre possibilité :
Réglages > Synchronisation dans l'application, puis coller l'adresse et le jeton.
Sur Chrome (ordinateur, Android), accepter la demande d'accès au réseau local la première fois.

Seul un appareil qui est sur le tailnet **et** qui a le jeton peut lire ou écrire. Pour aller plus loin,
une règle d'accès Tailscale (ACL) peut limiter le port 443 de la Pi aux appareils concernés.

## 4. Rappel du soir avec Home Assistant

`GET /status` (jeton `STATUS_TOKEN`, qui ne donne accès qu'à ce résumé) renvoie par exemple :
`{"today":"2026-11-21","todayMinutes":12,"todayItems":8,"streak":5,"lastActivity":"…","events":340}`.

Si Home Assistant tourne sur la Pi en réseau `host`, il lit `http://127.0.0.1:8787/status`.
Sinon, utiliser l'adresse `https://<pi>.<tailnet>.ts.net/status` si sa machine est sur le tailnet.

`secrets.yaml` :

```yaml
petit_a_petit_status: "Bearer <STATUS_TOKEN>"
```

`configuration.yaml` :

```yaml
rest:
  - resource: http://127.0.0.1:8787/status
    headers:
      Authorization: !secret petit_a_petit_status
    scan_interval: 600
    sensor:
      - name: Petit a petit minutes
        unique_id: petit_a_petit_minutes
        value_template: "{{ value_json.todayMinutes }}"
        unit_of_measurement: min
      - name: Petit a petit serie
        unique_id: petit_a_petit_serie
        value_template: "{{ value_json.streak }}"
```

Automatisation (adapter le service de notification au bon téléphone) :

```yaml
alias: Rappel français
triggers:
  - trigger: time
    at: "20:00:00"
conditions:
  - condition: numeric_state
    entity_id: sensor.petit_a_petit_minutes
    below: 10
actions:
  - action: notify.mobile_app_mon_telephone
    data:
      title: Petit à petit
      message: Bugünkü Fransızca serini henüz yapmadın. Birkaç dakika yeter!
```

## Données

Tout est dans `/var/lib/petit-a-petit-sync/events.jsonl` (une réponse par ligne). Une copie de ce fichier suffit
comme sauvegarde. L'application peut aussi exporter un fichier depuis Réglages > Sauvegarde.
