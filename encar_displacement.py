"""
Enrichit le catalogue avec la cylindrée moteur (ex: 1995 cm3 -> "2.0L"),
pour les véhicules dont l'annonce ne l'indique pas déjà en texte clair
(notamment BMW et Mercedes, qui utilisent des codes commerciaux comme
"420d" au lieu du litrage).

Cette donnée n'existe que sur la fiche détail de chaque véhicule (un appel
API par véhicule, pas par page comme pour la liste) -> on ne l'interroge
que pour les Id qui en ont réellement besoin, en parallèle, avec une
sauvegarde incrémentale pour pouvoir reprendre en cas de coupure sans tout
refaire.

Usage :
    python3 encar_displacement.py
"""

import json
import re
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

RAW_FILE = "encar_vehicules.json"
CACHE_FILE = "encar_displacement.json"   # { "<Id>": <cc en int> | null } — null = confirmé sans donnée (ex: électrique)
MAX_WORKERS = 3            # faible concurrence : l'API bloque (407) au-delà d'un certain débit
SLEEP_BETWEEN = 0.4        # pause par thread entre deux requêtes
SAVE_EVERY = 200
REQUEST_TIMEOUT = 10
MAX_RETRIES = 3
BLOCKED_BACKOFF = 30       # secondes d'attente si l'API nous bloque (407/429), avant nouvelle tentative

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.encar.com/",
    "Accept": "application/json, text/plain, */*",
}

# Badges où la cylindrée est déjà écrite en clair (ex: "1.6 TDI", "3.0 디젤")
# -> inutile d'interroger l'API détail pour ceux-là, on garde le texte.
TEXT_DISPLACEMENT_RE = re.compile(r"^\d{1,2}\.\d\b")


def needs_lookup(vehicle):
    badge = vehicle.get("Badge") or ""
    if TEXT_DISPLACEMENT_RE.match(badge):
        return False
    if vehicle.get("FuelType") == "전기":  # électrique : pas de cylindrée
        return False
    return True


class Blocked(Exception):
    """L'API nous bloque (407/429) — pas une absence de donnée, à réessayer."""


def fetch_displacement(vehicle_id, session):
    """Retourne (vehicle_id, displacement, ok). ok=False = échec réseau/blocage,
    à NE PAS mettre en cache (sera retenté au prochain run). ok=True avec
    displacement=None = l'API a bien répondu mais n'a pas cette donnée
    (ex: véhicule électrique) : ça, c'est un vrai "pas de résultat"."""
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
            disp = (data.get("spec") or {}).get("displacement")
            time.sleep(SLEEP_BETWEEN)
            return vehicle_id, disp, True
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
    todo = [v["Id"] for v in raw if v.get("Id") not in cache and needs_lookup(v)]
    print(f"{len(raw)} vehicules au total, {len(todo)} a interroger (cylindree absente du texte).")

    if not todo:
        print("Rien a faire, cache deja complet.")
        return

    done = 0
    sans_resultat = 0
    echecs = 0
    session = requests.Session()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_displacement, vid, session): vid for vid in todo}
        for future in as_completed(futures):
            vid, disp, ok = future.result()
            done += 1
            if ok:
                cache[vid] = disp  # None ici = confirmé sans donnée (ex: électrique)
                if disp is None:
                    sans_resultat += 1
            else:
                echecs += 1  # pas mis en cache -> retenté au prochain run
            if done % SAVE_EVERY == 0:
                save_cache(cache)
                print(f"{done}/{len(todo)} traites ({sans_resultat} sans donnee, {echecs} echecs a retenter) -- sauvegarde intermediaire")

    save_cache(cache)
    print(f"\nTermine : {done} traites, {sans_resultat} sans donnee confirmee, {echecs} echecs a retenter. Cache dans {CACHE_FILE}")


if __name__ == "__main__":
    main()
