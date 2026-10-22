from __future__ import annotations

import re
import json

INPUT_FILE = "encar_vehicules.json"
OUTPUT_FILE = "cars_from_encar.json"
DISPLACEMENT_CACHE_FILE = "encar_displacement.json"  # généré par encar_displacement.py

WON_PER_EUR = 1538
EUR_PER_KRW = 1 / WON_PER_EUR
PRICE_UNIT_KRW = 10000
PHOTO_CDN_BASE = "https://ci.encar.com"

MANUFACTURER_MAP = {
    "롤스로이스": "Rolls-Royce",
    "현대": "Hyundai",
    "기아": "Kia",
    "제네시스": "Genesis",
    "쌍용": "SsangYong",
    "쉐보레": "Chevrolet",
    "벤츠": "Mercedes-Benz",
    "BMW": "BMW",
    "아우디": "Audi",
    "폭스바겐": "Volkswagen",
    "토요타": "Toyota",
    "렉서스": "Lexus",
    "포르쉐": "Porsche",
    "테슬라": "Tesla",
    "랜드로버": "Land Rover",
    "재규어": "Jaguar",
    "볼보": "Volvo",
    "미니": "Mini",
    "페라리": "Ferrari",
    "람보르기니": "Lamborghini",
    "마세라티": "Maserati",
    "벤틀리": "Bentley",
    "포드": "Ford",
    "링컨": "Lincoln",
    "스마트": "Smart",
        "혼다": "Honda",
    "지리": "Geely",
    "미쯔비시": "Mitsubishi",
    "지프": "Jeep",
    "푸조": "Peugeot",
    "스즈키": "Suzuki",
    "스바루": "Subaru",
    "닛산": "Nissan",
    "애스턴마틴": "Aston Martin",
    "동풍소콘": "Dongfeng Sokon",
    "피아트": "Fiat",
    "닷지": "Dodge",
    "이네오스": "Ineos",
    "폴스타": "Polestar",
    "사브": "Saab",
    "맥라렌": "McLaren",
    "도요타": "Toyota",
    "마쯔다": "Mazda",
    "캐딜락": "Cadillac",
    "인피니티": "Infiniti",
    "GMC": "GMC",
    "험머": "Hummer",
    "크라이슬러": "Chrysler",
    "BYD": "BYD",
    "시트로엥/DS": "Citroën/DS",
    "북기은상": "BAIC Yinxiang",
    "기타 수입차": "Autre importateur",
}

FUEL_MAP = {
    "\uac00\uc194\ub9b0": "Essence",
    "\ub514\uc824": "Diesel",
    "\ud558\uc774\ub9ac\ub4dc": "Hybride",
    "\uc804\uae30": "\u00c9lectrique",
    "LPG": "GPL",
}

MODEL_MAP = {
    "고스트": "Ghost",
    "팬텀": "Phantom",
    "레이스": "Wraith",
    "컬리넌": "Cullinan",
}

# Suffixes techniques coréens à retirer (génération, restylage...) —
# ils n'apportent rien à un client français et polluent le nom affiché.
SUFFIX_PATTERNS = [
    r"\d+세대",           # ex: "2세대" = "2ème génération"
    r"부분변경",           # "restylage"
    r"페이스리프트",        # "facelift"
    r"풀체인지",           # "changement complet"
    r"뉴",                # "New" (souvent redondant)
]


def clean_model_name(raw: str) -> str:
    """Retire les suffixes techniques coréens et traduit le nom de base si connu."""
    cleaned = raw
    for pattern in SUFFIX_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned)
    cleaned = cleaned.strip()

    # Essaie de traduire le premier "mot" (souvent le nom de la gamme)
    for korean, french in MODEL_MAP.items():
        if korean in cleaned:
            cleaned = cleaned.replace(korean, french)

    return cleaned.strip()

def translate(mapping, value):
    return mapping.get(value, value)


def build_photo_url(vehicle):
    photos = vehicle.get("Photos") or []
    if not photos:
        return None
    first = sorted(photos, key=lambda p: p.get("ordering", 999))[0]
    return f"{PHOTO_CDN_BASE}{first['location']}"


# Beaucoup d'annonces écrivent déjà la cylindrée en clair dans le badge
# (ex: "1.6 TDI", "2.0 TSI", "3.0 디젤") — on la récupère directement, avec
# le sigle moteur (TDI/TSI/BlueHDi...) s'il est en latin.
TEXT_DISPLACEMENT_RE = re.compile(r"^(\d{1,2}\.\d)\s*([A-Za-z][A-Za-z0-9]*)?")


def build_motorisation(badge: str, displacement_cc, carburant_fr: str) -> str | None:
    """Ex: '2.0L TDI', '1.6L Diesel', '3.0L Essence'. None si pas de donnée
    exploitable (véhicules électriques notamment)."""
    badge = badge or ""
    m = TEXT_DISPLACEMENT_RE.match(badge)
    if m:
        litres, sigle = m.group(1), m.group(2)
        return f"{litres}L {sigle}" if sigle else (f"{litres}L {carburant_fr}" if carburant_fr else f"{litres}L")

    if displacement_cc:
        litres = round(displacement_cc / 1000, 1)
        return f"{litres}L {carburant_fr}" if carburant_fr else f"{litres}L"

    return None


def transform_vehicle(v, displacement_cache):
    year_raw = v.get("Year")
    annee = int(str(int(year_raw))[:4]) if year_raw else None

    price_raw = v.get("Price")
    prix_eur = round(price_raw * PRICE_UNIT_KRW * EUR_PER_KRW) if price_raw else None

    carburant = translate(FUEL_MAP, v.get("FuelType", ""))
    motorisation = build_motorisation(
        v.get("Badge", ""),
        displacement_cache.get(v.get("Id")),
        carburant,
    )

    return {
        "id": v.get("Id"),
        "marque": translate(MANUFACTURER_MAP, v.get("Manufacturer", "")),
        "modele": clean_model_name(v.get("Model", "")),
        "badge_technique": v.get("Badge", ""),
        "motorisation": motorisation,
        "annee": annee,
        "km": int(v.get("Mileage", 0)),
        "carburant": carburant,
        "prix": prix_eur,
        "photo": build_photo_url(v),
        "region_coree": v.get("OfficeCityState", ""),
    }


def dedupe_by_id(raw):
    """Le scraper repasse parfois sur les mêmes annonces (tri par
    ModifiedDate instable pendant la pagination sur un catalogue qui bouge
    en continu) : un même véhicule peut apparaître des dizaines de fois.
    On ne garde qu'une occurrence par Id, sinon les tris/filtres du site
    (ex: BMW + prix décroissant) n'affichent en pratique qu'une poignée de
    véhicules distincts, noyés sous leurs propres doublons."""
    seen = set()
    unique = []
    for v in raw:
        vid = v.get("Id")
        if vid in seen:
            continue
        seen.add(vid)
        unique.append(v)
    return unique


def load_displacement_cache():
    try:
        with open(DISPLACEMENT_CACHE_FILE, encoding="utf-8") as f:
            cache = json.load(f)
    except FileNotFoundError:
        print(f"({DISPLACEMENT_CACHE_FILE} absent : motorisation uniquement via le texte des annonces)")
        return {}
    print(f"Cache cylindrée chargé : {len(cache)} véhicules ({DISPLACEMENT_CACHE_FILE})")
    return cache


def main():
    with open(INPUT_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    raw_count = len(raw)
    raw = dedupe_by_id(raw)
    doublons = raw_count - len(raw)
    if doublons:
        print(f"{doublons} doublon(s) retiré(s) (même Id vu plusieurs fois) sur {raw_count} annonces brutes.")

    displacement_cache = load_displacement_cache()
    transformed = [transform_vehicle(v, displacement_cache) for v in raw]

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(transformed, f, ensure_ascii=False, indent=2)

    print(f"{len(transformed)} vehicules transformes -> {OUTPUT_FILE}")

    if transformed:
        print("\nExemple (1er vehicule) :")
        print(json.dumps(transformed[0], ensure_ascii=False, indent=2))

    marques_brutes = {v.get("Manufacturer") for v in raw}
    non_traduites = [m for m in marques_brutes if m not in MANUFACTURER_MAP]
    if non_traduites:
        print(f"\n{len(non_traduites)} marque(s) non traduite(s), a ajouter dans MANUFACTURER_MAP :")
        for m in non_traduites:
            print(f"  - {m}")


if __name__ == "__main__":
    main()

