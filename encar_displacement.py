"""
Enrichit le catalogue avec les specs moteur de chaque véhicule : cylindrée
(ex: 1995 cm3 -> "2.0L") et transmission (auto / manuelle).

Ces deux données n'existent que sur la fiche détail de chaque véhicule (un
appel API par véhicule, pas par page comme pour la liste) -> on interroge
TOUS les véhicules pas encore dans le cache, en parallèle (faible
concurrence : l'API bloque au-delà d'un certain débit — déjà vu en
pratique), avec sauvegarde incrémentale pour reprendre sans tout refaire en
cas de coupure ou de nouveau blocage.

Encar bloque parfois par intermittence (CAPTCHA anti-bot), pour une durée
variable. Ce script est autonome : si un passage échoue presque totalement,
il attend une longue pause puis réessaie tout seul, en boucle, jusqu'à ce
que tout le catalogue soit couvert (ou jusqu'à MAX_RUNTIME_HOURS). Pas
besoin de le relancer manuellement à chaque blocage.

Usage :
    python3 encar_displacement.py
"""

import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

RAW_FILE = "encar_vehicules.json"
CACHE_FILE = "encar_specs.json"   # { "<Id>": {"displacement": cc|null, "transmission": "Auto"|"Manuelle"|null} }
MAX_WORKERS = 5
SLEEP_BETWEEN = 0.3        # pause par thread après une requête réussie
SAVE_EVERY = 200
REQUEST_TIMEOUT = 10
CHUNK_SIZE = 1500          # taille d'un passage — volontairement petit pour que la pause
                           # globale (plus bas) reprenne la main vite en cas de blocage,
                           # au lieu de rester coincé des heures dans un seul passage géant

# ── Boucle de reprise automatique ──
MAX_RUNTIME_HOURS = 8           # sécurité : le script s'arrête après ce délai, même inachevé
COOLDOWN_IF_BLOCKED = 180       # 3 min de pause si un passage échoue presque totalement
COOLDOWN_MAX = 900              # 15 min max entre deux tentatives (après blocages répétés)
BLOCKED_THRESHOLD = 0.5         # un passage est jugé "bloqué" si plus de 50% des items échouent

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.encar.com/",
    "Accept": "application/json, text/plain, */*",
}

TRANSMISSION_MAP = {
    "오토": "Automatique",
    "수동": "Manuelle",
    "세미오토": "Semi-automatique",
    "CVT": "CVT",
}


def fetch_specs(vehicle_id, session):
    """Retourne (vehicle_id, specs|None, ok). ok=False = échec réseau/blocage,
    à NE PAS mettre en cache (sera retenté au prochain passage).

    Échec rapide et SANS longue pause ici : un véhicule bloqué (407/429) ne
    doit pas monopoliser un worker pendant 1-2 minutes à retenter en boucle —
    la pause (bien plus longue) se fait une seule fois, au niveau du passage
    entier dans main(), pas ici. Sinon un passage avec beaucoup d'échecs peut
    prendre des heures avant même que la logique de pause globale n'entre en jeu."""
    url = f"https://api.encar.com/v1/readside/vehicle/{vehicle_id}"
    try:
        r = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if r.status_code != 200:
            return vehicle_id, None, False
        data = r.json()
        spec = data.get("spec") or {}
        specs = {
            "displacement": spec.get("displacement"),
            "transmission": TRANSMISSION_MAP.get(spec.get("transmissionName"), spec.get("transmissionName")),
        }
        time.sleep(SLEEP_BETWEEN)
        return vehicle_id, specs, True
    except (requests.exceptions.RequestException, ValueError):
        return vehicle_id, None, False


def load_cache():
    try:
        with open(CACHE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def save_cache(cache):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)


def run_batch(todo, cache):
    """Un passage sur la liste à traiter. Retourne (succes, echecs)."""
    done = 0
    succes = 0
    echecs = 0
    session = requests.Session()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_specs, vid, session): vid for vid in todo}
        for future in as_completed(futures):
            vid, specs, ok = future.result()
            done += 1
            if ok:
                cache[vid] = specs
                succes += 1
            else:
                echecs += 1  # pas mis en cache -> retenté au prochain passage
            if done % SAVE_EVERY == 0:
                save_cache(cache)
                print(f"{done}/{len(todo)} traites ({echecs} echecs) -- sauvegarde intermediaire")

    save_cache(cache)
    return succes, echecs


def main():
    with open(RAW_FILE, encoding="utf-8") as f:
        raw = json.load(f)
    all_ids = {v["Id"] for v in raw}

    cache = load_cache()
    start = time.time()
    cooldown = COOLDOWN_IF_BLOCKED

    while True:
        todo_all = [vid for vid in all_ids if vid not in cache]
        if not todo_all:
            print(f"\nTermine : cache complet ({len(cache)}/{len(all_ids)}) dans {CACHE_FILE}")
            return

        elapsed_h = (time.time() - start) / 3600
        if elapsed_h >= MAX_RUNTIME_HOURS:
            print(f"\nLimite de {MAX_RUNTIME_HOURS}h atteinte. {len(todo_all)} vehicules restants "
                  f"({len(cache)}/{len(all_ids)} fait). Relancer le script reprendra pile ou il s'est arrete.")
            return

        todo = todo_all[:CHUNK_SIZE]
        print(f"\nPassage : {len(todo)} vehicules a interroger ({len(cache)}/{len(all_ids)} deja en cache, "
              f"{len(todo_all)} restants au total).")
        succes, echecs = run_batch(todo, cache)
        taux_echec = echecs / (succes + echecs) if (succes + echecs) else 0
        print(f"Passage termine : {succes} succes, {echecs} echecs ({taux_echec:.0%} d'echec).")

        if taux_echec >= BLOCKED_THRESHOLD:
            print(f"Taux d'echec eleve -> probable blocage Encar. Pause de {cooldown}s avant nouvelle tentative.")
            time.sleep(cooldown)
            cooldown = min(cooldown * 2, COOLDOWN_MAX)  # recule de plus en plus si ça persiste
        else:
            cooldown = COOLDOWN_IF_BLOCKED  # reset : ça repasse bien, pas besoin d'attendre longtemps


if __name__ == "__main__":
    main()
