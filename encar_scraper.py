"""
Scraper Encar — version par tranches de prix.

L'API Encar plafonne la pagination à un offset de ~10 000, quel que soit le
tri ou le filtre utilisé (limite classique de moteur de recherche type
Elasticsearch : au-delà, elle renvoie la même page en boucle au lieu
d'avancer). Comme le catalogue complet fait ~65 000+ véhicules, il est
impossible de tout récupérer avec une seule requête paginée.

La solution : découper le catalogue en tranches de prix (Price.range),
suffisamment fines pour que chaque tranche reste sous la limite, puis
paginer chaque tranche séparément (offset 0 → count de la tranche). Le
découpage est adaptatif : une tranche encore trop grosse est coupée en deux
récursivement.

Usage :
    python encar_scraper.py
"""

import requests
import time
import json

API_BASE = "https://api.encar.com/search/car/list/general"
OUTPUT_FILE = "encar_vehicules.json"
BASE_FILTER = "(And.Hidden.N._.CarType.N.)"

PAGE_SIZE = 200                # taille de page pendant la pagination d'une tranche
SLEEP_BETWEEN_CALLS = 1.0      # entre deux pages de véhicules
SLEEP_BETWEEN_COUNTS = 0.3     # entre deux vérifications de comptage (requêtes légères)
SAVE_EVERY_N_PAGES = 10        # sauvegarde intermédiaire toutes les 10 pages (~2000 véhicules)

# Fenêtre de pagination max tolérée par tranche (l'API bloque à 10 000 ;
# on coupe une tranche dès qu'elle dépasse ce seuil, avec une bonne marge).
SAFE_BUCKET_COUNT = 9000
# Offset max qu'on s'autorise à atteindre dans une tranche, par sécurité si
# son comptage a grossi entre la découpe et la pagination (catalogue live).
MAX_OFFSET_PER_BUCKET = 9600

# Bornes de prix explorées (unité Encar = 10 000 KRW). Le catalogue observé
# va de ~10 à ~170 000 ; on prend large pour couvrir la hausse des prix.
PRICE_MIN = 0
PRICE_MAX = 300000

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.encar.com/",
    "Accept": "application/json, text/plain, */*",
}


def price_query(lo, hi):
    return f"(And.Hidden.N._.CarType.N._.Price.range({lo}..{hi}).)"


def api_call(query, offset, limit):
    params = {
        "count": "true",
        "q": query,
        # PriceDesc : classement stable d'une page à l'autre (vérifié : appels
        # répétés renvoient le même ordre), contrairement à ModifiedDate qui
        # dérive en continu sur un catalogue mis à jour sans arrêt.
        "sr": f"|PriceDesc|{offset}|{limit}",
    }
    response = requests.get(API_BASE, params=params, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return response.json()


def get_count(lo, hi, retries=3):
    for attempt in range(retries):
        try:
            data = api_call(price_query(lo, hi), 0, 1)
            return data.get("Count", 0)
        except (requests.exceptions.RequestException, ValueError) as e:
            print(f"  Comptage [{lo}-{hi}] : erreur ({e}), tentative {attempt + 1}/{retries}")
            time.sleep(2)
    print(f"  Comptage [{lo}-{hi}] : abandon apres {retries} tentatives, tranche ignoree.")
    return 0


def build_buckets(lo, hi):
    """Découpe récursivement [lo, hi] en tranches de prix dont le nombre de
    résultats reste sous SAFE_BUCKET_COUNT."""
    count = get_count(lo, hi)
    time.sleep(SLEEP_BETWEEN_COUNTS)

    if count == 0:
        return []
    if count <= SAFE_BUCKET_COUNT or hi - lo < 2:
        return [(lo, hi, count)]

    mid = (lo + hi) // 2
    if mid == lo:
        return [(lo, hi, count)]

    return build_buckets(lo, mid) + build_buckets(mid, hi)


def save(vehicles):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(vehicles, f, ensure_ascii=False, indent=2)


def scrape_bucket(lo, hi, count, all_vehicles, seen_ids, page_num):
    query = price_query(lo, hi)
    offset = 0
    consecutive_errors = 0

    while offset < count and offset <= MAX_OFFSET_PER_BUCKET:
        try:
            data = api_call(query, offset, PAGE_SIZE)
            consecutive_errors = 0
        except requests.exceptions.RequestException as e:
            consecutive_errors += 1
            print(f"  [{lo}-{hi}] offset {offset} : erreur reseau ({e}). Tentative {consecutive_errors}/3...")
            if consecutive_errors >= 3:
                print(f"  [{lo}-{hi}] 3 erreurs de suite, tranche interrompue.")
                break
            time.sleep(5)
            continue
        except ValueError:
            print(f"  [{lo}-{hi}] reponse non-JSON, tranche interrompue.")
            break

        vehicles = data.get("SearchResults", [])
        if not vehicles:
            break

        nouveaux = [v for v in vehicles if v.get("Id") not in seen_ids]
        for v in nouveaux:
            seen_ids.add(v.get("Id"))
        all_vehicles.extend(nouveaux)

        page_num[0] += 1
        if page_num[0] % 10 == 0:
            print(f"Page {page_num[0]} -> {len(all_vehicles)} vehicules recuperes (tranche [{lo}-{hi}], offset {offset})")
        if page_num[0] % SAVE_EVERY_N_PAGES == 0:
            save(all_vehicles)
            print(f"  [sauvegarde intermediaire : {len(all_vehicles)} vehicules dans {OUTPUT_FILE}]")

        offset += PAGE_SIZE
        time.sleep(SLEEP_BETWEEN_CALLS)

    if offset > MAX_OFFSET_PER_BUCKET:
        print(f"  [{lo}-{hi}] tranche encore trop dense (>{MAX_OFFSET_PER_BUCKET} vu en cours de route), "
              f"couverture partielle pour cette tranche.")


def main():
    print("Decoupage du catalogue en tranches de prix...")
    buckets = build_buckets(PRICE_MIN, PRICE_MAX)
    total_attendu = sum(c for _, _, c in buckets)
    print(f"{len(buckets)} tranche(s), {total_attendu} annonces attendues (avant dedoublonnage).\n")

    all_vehicles = []
    seen_ids = set()
    page_num = [0]

    for i, (lo, hi, count) in enumerate(buckets, start=1):
        print(f"Tranche {i}/{len(buckets)} : prix [{lo}-{hi}] -> {count} annonces")
        scrape_bucket(lo, hi, count, all_vehicles, seen_ids, page_num)

    save(all_vehicles)
    print(f"\nTermine : {len(all_vehicles)} vehicules uniques enregistres dans {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
