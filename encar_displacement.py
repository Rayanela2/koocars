"""
Enrichit le catalogue avec les specs moteur de chaque véhicule : cylindrée
(ex: 1995 cm3 -> "2.0L") et transmission (auto / manuelle).

Ces deux données n'existent que sur la fiche détail de chaque véhicule (un
appel API par véhicule, pas par page comme pour la liste) -> on interroge
TOUS les véhicules pas encore dans le cache, en parallèle (faible
concurrence : l'API bloque au-delà d'un certain débit — déjà vu en
pratique), avec sauvegarde incrémentale pour reprendre sans tout refaire en
cas de coupure ou de nouveau blocage.

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
MAX_RETRIES = 3
BLOCKED_BACKOFF = 30       # secondes d'attente si l'API nous bloque (407/429), avant nouvelle tentative

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
    à NE PAS mettre en cache (sera retenté au prochain run)."""
    url = f"https://api.encar.com/v1/readside/vehicle/{vehicle_id}"

    for attempt in range(MAX_RETRIES):
        try:
            r = session.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
            if r.status_code in (407, 429):
                time.sleep(BLOCKED_BACKOFF)
                continue
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
            time.sleep(2)
            continue

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


def main():
    with open(RAW_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    cache = load_cache()
    all_ids = {v["Id"] for v in raw}
    todo = [vid for vid in all_ids if vid not in cache]
    print(f"{len(all_ids)} vehicules au total, {len(todo)} a interroger.")

    if not todo:
        print("Rien a faire, cache deja complet.")
        return

    done = 0
    echecs = 0
    session = requests.Session()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_specs, vid, session): vid for vid in todo}
        for future in as_completed(futures):
            vid, specs, ok = future.result()
            done += 1
            if ok:
                cache[vid] = specs
            else:
                echecs += 1  # pas mis en cache -> retenté au prochain run
            if done % SAVE_EVERY == 0:
                save_cache(cache)
                print(f"{done}/{len(todo)} traites ({echecs} echecs a retenter) -- sauvegarde intermediaire")

    save_cache(cache)
    print(f"\nTermine : {done} traites, {echecs} echecs a retenter. Cache dans {CACHE_FILE}")


if __name__ == "__main__":
    main()
