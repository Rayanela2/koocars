"""
Scraper Encar — récupère tous les véhicules du catalogue via l'API de recherche.

⚠️ IMPORTANT : je n'ai pas pu vérifier ce script en conditions réelles (pas
d'accès réseau vers encar.com depuis mon environnement). Le format d'URL
ci-dessous correspond au pattern d'API généralement utilisé par Encar pour
ce type de recherche, mais il peut avoir changé ou nécessiter un ajustement.

SI ÇA NE MARCHE PAS DU PREMIER COUP :
  1. Lance le script, regarde l'erreur (ou le contenu de la réponse si elle
     n'est pas au format JSON attendu).
  2. Colle-moi l'erreur / la réponse brute, je corrige le script.

Usage :
    pip install requests --break-system-packages
    python encar_scraper.py
"""

import requests
import time
import json
from urllib.parse import quote

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
API_BASE = "https://api.encar.com/search/car/list/general"
OUTPUT_FILE = "encar_vehicules.json"

# Filtre repris de ton URL : (And.Hidden.N._.CarType.N.)
# Hidden.N = pas de véhicules masqués/vendus, CarType.N = véhicules neufs
# d'occasion (le "for" de fc_carsearchlist.do?carType=for)
FILTER_QUERY = "(And.Hidden.N._.CarType.N.)"

PAGE_SIZE = 20          # correspond au "limit":20 de ton URL
SLEEP_BETWEEN_CALLS = 1.0  # secondes — pour ne pas marteler le serveur
MAX_PAGES = None        # None = jusqu'à épuisement ; mets un nombre pour tester d'abord (ex: 3)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/124.0.0.0 Safari/537.36",
    "Referer": "https://www.encar.com/",
    "Accept": "application/json, text/plain, */*",
}


def fetch_page(offset: int, limit: int) -> dict:
    """Récupère une page de résultats. `offset` = nombre de véhicules déjà vus."""
    params = {
        "count": "true",
        "q": FILTER_QUERY,
        "sr": f"|ModifiedDate|{offset}|{limit}",
    }
    response = requests.get(API_BASE, params=params, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return response.json()


def main():
    all_vehicles = []
    offset = 0
    page_num = 1
    total_count = None

    while True:
        print(f"Page {page_num} (offset {offset})...")
        try:
            data = fetch_page(offset, PAGE_SIZE)
        except requests.exceptions.RequestException as e:
            print(f"Erreur réseau : {e}")
            break
        except ValueError:
            print("La réponse n'est pas du JSON valide — l'API a peut-être changé de format.")
            print("Réponse brute reçue :")
            print(response.text[:500])
            break

        # Adapte cette clé selon la vraie structure de réponse une fois testée.
        # Les APIs Encar renvoient généralement quelque chose comme :
        # { "Count": 15234, "SearchResults": [ {...}, {...}, ... ] }
        vehicles = data.get("SearchResults", [])
        if total_count is None:
            total_count = data.get("Count", 0)
            print(f"Total annoncé par l'API : {total_count} véhicules")

        if not vehicles:
            print("Plus de résultats, arrêt.")
            break

        all_vehicles.extend(vehicles)
        print(f"  → {len(vehicles)} véhicules récupérés (total cumulé : {len(all_vehicles)})")

        offset += PAGE_SIZE
        page_num += 1

        if MAX_PAGES and page_num > MAX_PAGES:
            print(f"Limite de {MAX_PAGES} pages atteinte (mode test), arrêt.")
            break

        if total_count and offset >= total_count:
            print("Tous les véhicules ont été récupérés.")
            break

        time.sleep(SLEEP_BETWEEN_CALLS)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_vehicles, f, ensure_ascii=False, indent=2)

    print(f"\n✅ {len(all_vehicles)} véhicules enregistrés dans {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
