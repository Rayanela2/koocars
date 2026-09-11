"""
Scraper Encar — version avec sauvegarde progressive.
Récupère tous les véhicules du catalogue, en sauvegardant régulièrement
pour ne rien perdre en cas de coupure/blocage en cours de route.

Usage :
    python encar_scraper.py
"""

import requests
import time
import json

API_BASE = "https://api.encar.com/search/car/list/general"
OUTPUT_FILE = "encar_vehicules.json"
FILTER_QUERY = "(And.Hidden.N._.CarType.N.)"
PAGE_SIZE = 20
SLEEP_BETWEEN_CALLS = 1.0
MAX_PAGES = None          # None = jusqu'au bout
SAVE_EVERY_N_PAGES = 50   # sauvegarde intermédiaire toutes les 50 pages (~1000 véhicules)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.encar.com/",
    "Accept": "application/json, text/plain, */*",
}


def fetch_page(offset, limit):
    params = {
        "count": "true",
        "q": FILTER_QUERY,
        "sr": f"|ModifiedDate|{offset}|{limit}",
    }
    response = requests.get(API_BASE, params=params, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return response


def save(vehicles):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(vehicles, f, ensure_ascii=False, indent=2)


def main():
    all_vehicles = []
    offset = 0
    page_num = 1
    total_count = None
    consecutive_errors = 0

    while True:
        try:
            response = fetch_page(offset, PAGE_SIZE)
            data = response.json()
            consecutive_errors = 0
        except requests.exceptions.RequestException as e:
            consecutive_errors += 1
            print(f"Page {page_num}: erreur reseau ({e}). Tentative {consecutive_errors}/3...")
            if consecutive_errors >= 3:
                print("3 erreurs de suite, arret. Sauvegarde de ce qui a ete recupere.")
                break
            time.sleep(5)
            continue
        except ValueError:
            print("Reponse non-JSON, arret.")
            print(response.text[:500])
            break

        vehicles = data.get("SearchResults", [])
        if total_count is None:
            total_count = data.get("Count", 0)
            print(f"Total annonce par l'API : {total_count} vehicules")
            print(f"Pages prevues : {-(-total_count // PAGE_SIZE)}")

        if not vehicles:
            print("Plus de resultats, arret normal.")
            break

        all_vehicles.extend(vehicles)

        if page_num % 10 == 0 or page_num == 1:
            print(f"Page {page_num} -> {len(all_vehicles)}/{total_count} vehicules recuperes")

        if page_num % SAVE_EVERY_N_PAGES == 0:
            save(all_vehicles)
            print(f"  [sauvegarde intermediaire : {len(all_vehicles)} vehicules dans {OUTPUT_FILE}]")

        offset += PAGE_SIZE
        page_num += 1

        if MAX_PAGES and page_num > MAX_PAGES:
            print(f"Limite de {MAX_PAGES} pages atteinte, arret.")
            break
        if total_count and offset >= total_count:
            print("Tous les vehicules ont ete recuperes.")
            break

        time.sleep(SLEEP_BETWEEN_CALLS)

    save(all_vehicles)
    print(f"\nTermine : {len(all_vehicles)} vehicules enregistres dans {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
