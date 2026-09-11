import re
import json

INPUT_FILE = "encar_vehicules.json"
OUTPUT_FILE = "cars_from_encar.json"

EUR_PER_KRW = 0.00068
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


def transform_vehicle(v):
    year_raw = v.get("Year")
    annee = int(str(int(year_raw))[:4]) if year_raw else None

    price_raw = v.get("Price")
    prix_eur = round(price_raw * PRICE_UNIT_KRW * EUR_PER_KRW) if price_raw else None

    return {
        "id": v.get("Id"),
        "marque": translate(MANUFACTURER_MAP, v.get("Manufacturer", "")),
        "modele": clean_model_name(v.get("Model", "")),
        "badge_technique": v.get("Badge", ""),
        "annee": annee,
        "km": int(v.get("Mileage", 0)),
        "carburant": translate(FUEL_MAP, v.get("FuelType", "")),
        "prix": prix_eur,
        "photo": build_photo_url(v),
        "region_coree": v.get("OfficeCityState", ""),
    }


def main():
    with open(INPUT_FILE, encoding="utf-8") as f:
        raw = json.load(f)

    transformed = [transform_vehicle(v) for v in raw]

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

