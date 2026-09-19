import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PricingService } from '../services/pricing.service';

interface RawCar {
  id: string;
  marque: string;
  modele: string;
  badge_technique?: string;
  annee: number;
  km: number;
  carburant: string;
  prix: number; // prix d'achat BRUT — jamais affiché directement
  photo: string;
  region_coree?: string;
}

interface Car extends RawCar {
  prixFinal: number;
}

@Component({
  selector: 'app-vehicule',
  imports: [RouterLink, FormsModule],
  templateUrl: './vehicule.html',
  styleUrl: './vehicule.css',
})
export class Vehicule implements OnInit {
  constructor(
    private pricing: PricingService,
    private route: ActivatedRoute
  ) {}

  @ViewChild('brandCarousel') brandCarousel?: ElementRef<HTMLElement>;

  menuOpen = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  private readonly BRAND_LOGOS: Record<string, string> = {
    kia: 'https://www.carlogos.org/car-logos/kia-logo-2021.png',
    hyundai: 'https://www.carlogos.org/car-logos/hyundai-logo.png',
    genesis: 'https://www.carlogos.org/car-logos/genesis-logo.png',
    audi: 'https://www.carlogos.org/car-logos/audi-logo.png',
    bmw: 'https://www.carlogos.org/car-logos/bmw-logo.png',
    mercedes: 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
    'mercedes-benz': 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
    volkswagen: 'https://www.carlogos.org/car-logos/volkswagen-logo.png',
    toyota: 'https://www.carlogos.org/car-logos/toyota-logo.png',
    porsche: 'https://www.carlogos.org/car-logos/porsche-logo.png',
    tesla: 'https://www.carlogos.org/car-logos/tesla-logo.png',
    lexus: 'https://www.carlogos.org/car-logos/lexus-logo.png',
    'rolls-royce': 'https://www.carlogos.org/car-logos/rolls-royce-logo.png',
    volvo: 'https://www.carlogos.org/car-logos/volvo-logo.png',
    mini: 'https://www.carlogos.org/car-logos/mini-logo.png',
    'land rover': 'https://www.carlogos.org/car-logos/land-rover-logo.png',
    bentley: 'https://www.carlogos.org/car-logos/bentley-logo.png',
    lincoln: 'https://www.carlogos.org/car-logos/lincoln-logo.png',
    smart: 'https://www.carlogos.org/car-logos/smart-logo.png',
  };

  // Traductions de carburant pour les combinaisons non couvertes par
  // le script Python (ex: "essence+électrique" écrit en un seul terme coréen).
  private readonly FUEL_MAP_EXTRA: Record<string, string> = {
    '가솔린+전기': 'Hybride',
    '가솔린+CNG': 'Essence/GPL',
    '디젤+전기': 'Hybride diesel',
    'LPG+전기': 'Hybride GPL',
  };

  cars: Car[] = [];
  loading = true;
  loadError = false;

  // ── Fiche détail (modal) ──
  selectedCar: Car | null = null;

  openDetail(car: Car): void {
    this.selectedCar = car;
  }

  closeDetail(): void {
    this.selectedCar = null;
  }

  scrollBrands(direction: number): void {
    this.brandCarousel?.nativeElement.scrollBy({
      left: direction * 270,
      behavior: 'smooth',
    });
  }

  limit = 60;
  activeFilter = 'all';
  filterOrigine: 'coree' | 'france' = 'coree';
  filterAchat: 'encheres' | 'stock' | 'both' = 'both';
  filterModele = '';
  filterCarburant = '';
  filterAnneeMin: number | null = null;
  filterAnneeMax: number | null = null;
  filterKmMin: number | null = null;
  filterKmMax: number | null = null;
  searchQuery = '';

  brandMenuOpen = false;
  brandSearch = '';
  modeleMenuOpen = false;
  modeleSearch = '';
  carburantMenuOpen = false;
  carburantSearch = '';
  brandSelectedFromQuery = false;

  async ngOnInit(): Promise<void> {
    try {
      // Chargé en tant que fichier statique (public/data/...), jamais importé
      // dans le bundle JS — évite l'OOM esbuild sur un fichier de 20+ Mo.
      const response = await fetch('/data/cars_from_encar.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = (await response.json()) as RawCar[];

      this.cars = raw.map((c) => {
        const modeleClean = this.cleanText(c.modele) || c.marque;
        const carburantClean =
          this.FUEL_MAP_EXTRA[c.carburant] ?? this.cleanText(c.carburant) ?? c.carburant;

        return {
          ...c,
          modele: modeleClean,
          carburant: carburantClean || c.carburant, // évite une chaîne vide
          badge_technique: c.badge_technique ? this.cleanText(c.badge_technique) : c.badge_technique,
          // Vrai calcul PricingService (dédouanement, livraison, frais
          // collaborateur, TVA, bénéfice) — jamais c.prix (brut) affiché.
          prixFinal: this.pricing.computePrixFinal(c.prix),
        };
      });

      this.applyBrandFromQuery();
    } catch (e) {
      console.error('Impossible de charger le catalogue Encar :', e);
      this.loadError = true;
    } finally {
      this.loading = false;
    }
  }

  private applyBrandFromQuery(): void {
    const requestedBrand = (
      this.route.snapshot.paramMap.get('marque') ??
      this.route.snapshot.queryParamMap.get('marque')
    )?.toLowerCase();
    if (!requestedBrand) return;

    const matchingBrand = this.brandTiles.find((brand) => {
      const brandName = brand.nom.toLowerCase();
      return brandName === requestedBrand || brandName.startsWith(requestedBrand) || requestedBrand.startsWith(brandName);
    });

    if (matchingBrand) {
      this.activeFilter = matchingBrand.nom.toLowerCase();
      this.brandSelectedFromQuery = true;
      this.limit = 60;
    }
  }

  /** À incrémenter quand le traitement des photos change : force navigateur et CDN à recharger. */
  private static readonly PHOTO_VERSION = 4;
  private static readonly ENCAR_PHOTO = /^https:\/\/ci\.encar\.com(\/carpicture\d+\/pic\d+\/\d+_\d+\.jpe?g)$/i;

  /** Photo passée par /api/photo, qui retire les marques Encar ; sinon l'URL d'origine. */
  photoUrl(url: string): string {
    const m = Vehicule.ENCAR_PHOTO.exec(url);
    return m ? `/api/photo?v=${Vehicule.PHOTO_VERSION}&p=${m[1]}` : url;
  }

  /** Si le traitement est indisponible, on revient à l'original (badge KC en CSS par-dessus). */
  onPhotoError(event: Event, original: string): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = original;
    img.parentElement?.classList.add('wm-fallback');
  }

  loadMore(): void {
    this.limit += 60;
  }

  onSearchChange(): void {
    this.limit = 60;
  }

  private matchesFilters(c: Car): boolean {
    if (this.filterOrigine === 'france') return false;

    const matchMarque = this.activeFilter === 'all' || c.marque.toLowerCase() === this.activeFilter;
    const matchModele = !this.filterModele || c.modele === this.filterModele;
    const matchCarburant = !this.filterCarburant || c.carburant === this.filterCarburant;
    const matchAnneeMin = this.filterAnneeMin == null || c.annee >= this.filterAnneeMin;
    const matchAnneeMax = this.filterAnneeMax == null || c.annee <= this.filterAnneeMax;
    const matchKmMin = this.filterKmMin == null || c.km >= this.filterKmMin;
    const matchKmMax = this.filterKmMax == null || c.km <= this.filterKmMax;
    const matchSearch =
      !this.searchQuery ||
      (c.marque + ' ' + c.modele + ' ' + c.annee + ' ' + c.carburant)
        .toLowerCase()
        .includes(this.searchQuery.toLowerCase());
    return (
      matchMarque &&
      matchModele &&
      matchCarburant &&
      matchAnneeMin &&
      matchAnneeMax &&
      matchKmMin &&
      matchKmMax &&
      matchSearch
    );
  }

  get filteredCars(): Car[] {
    return this.cars.filter((c) => this.matchesFilters(c)).slice(0, this.limit);
  }

  get totalFilteredCount(): number {
    return this.cars.filter((c) => this.matchesFilters(c)).length;
  }

  get totalVehicules(): number {
    return this.cars.length;
  }

  get showBrandSelection(): boolean {
    return !this.brandSelectedFromQuery && !(this.activeFilter !== 'all' && this.filterModele !== '');
  }

  get totalMarques(): number {
    return new Set(this.cars.map((c) => (c.marque || '').toLowerCase())).size;
  }

  get economieMax(): number {
    return 0;
  }

  get modelesDisponibles(): string[] {
    const carsForBrand =
      this.activeFilter === 'all'
        ? this.cars
        : this.cars.filter((c) => c.marque.toLowerCase() === this.activeFilter);
    return Array.from(new Set(carsForBrand.map((c) => c.modele))).sort();
  }

  get carburantsDisponibles(): string[] {
    return Array.from(new Set(this.cars.map((c) => c.carburant))).sort();
  }

  get brandTiles(): { nom: string; count: number; logo: string | null }[] {
    const counts = new Map<string, number>();
    for (const c of this.cars) {
      const marque = c.marque || 'Autre';
      counts.set(marque, (counts.get(marque) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([nom, count]) => ({
        nom,
        count,
        logo: this.BRAND_LOGOS[nom.toLowerCase()] || null,
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ── Menu Marque ──
  toggleBrandMenu(): void {
    this.brandMenuOpen = !this.brandMenuOpen;
    if (this.brandMenuOpen) this.brandSearch = '';
  }

  get selectedBrandLabel(): string {
    if (this.activeFilter === 'all') return 'Toutes les marques';
    const match = this.brandTiles.find((b) => b.nom.toLowerCase() === this.activeFilter);
    return match ? `${match.nom} (${match.count})` : 'Toutes les marques';
  }

  get filteredBrandTiles(): { nom: string; count: number; logo: string | null }[] {
    const q = this.brandSearch.toLowerCase();
    return this.brandTiles.filter((b) => b.nom.toLowerCase().includes(q));
  }

  selectBrand(value: string): void {
    this.activeFilter = value;
    this.filterModele = '';
    this.modeleSearch = '';
    this.limit = 60;
    this.brandMenuOpen = false;
    this.brandSearch = '';
  }

  // ── Menu Modèle ──
  toggleModeleMenu(): void {
    this.modeleMenuOpen = !this.modeleMenuOpen;
    if (this.modeleMenuOpen) this.modeleSearch = '';
  }

  get selectedModeleLabel(): string {
    return this.filterModele || 'Tous les modèles';
  }

  get filteredModelesDisponibles(): string[] {
    const q = this.modeleSearch.toLowerCase();
    return this.modelesDisponibles.filter((m) => m.toLowerCase().includes(q));
  }

  selectModele(value: string): void {
    this.filterModele = value;
    this.limit = 60;
    this.modeleMenuOpen = false;
    this.modeleSearch = '';
  }

  // ── Menu Carburant ──
  toggleCarburantMenu(): void {
    this.carburantMenuOpen = !this.carburantMenuOpen;
    if (this.carburantMenuOpen) this.carburantSearch = '';
  }

  get selectedCarburantLabel(): string {
    return this.filterCarburant || 'Tous les carburants';
  }

  get filteredCarburantsDisponibles(): string[] {
    const q = this.carburantSearch.toLowerCase();
    return this.carburantsDisponibles.filter((f) => f.toLowerCase().includes(q));
  }

  selectCarburant(value: string): void {
    this.filterCarburant = value;
    this.limit = 60;
    this.carburantMenuOpen = false;
    this.carburantSearch = '';
  }

  // ── Origine / Achat (toggles latéraux) ──
  setOrigine(o: 'coree' | 'france'): void {
    this.filterOrigine = o;
  }

  setAchat(a: 'encheres' | 'stock' | 'both'): void {
    this.filterAchat = a;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.filterModele = '';
    this.modeleSearch = '';
    this.limit = 60;
  }

  resetFilters(): void {
    this.activeFilter = 'all';
    this.filterOrigine = 'coree';
    this.filterAchat = 'both';
    this.filterModele = '';
    this.filterCarburant = '';
    this.filterAnneeMin = null;
    this.filterAnneeMax = null;
    this.filterKmMin = null;
    this.filterKmMax = null;
    this.searchQuery = '';
    this.limit = 60;
  }

  formatPrix(value: number): string {
    return `${value.toLocaleString('fr-FR')} €`;
  }

  formatKm(km: number): string {
    return `${km.toLocaleString('fr-FR')} km`;
  }

  isKorean(text: string): boolean {
    if (!text) return false;
    return /[\u3131-\uD79D\u1100-\u11FF]/.test(text);
  }

  cleanText(text: string | undefined): string {
    if (!text) return '';
    return text.replace(/[\u3131-\uD79D\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]/g, '').trim();
  }
}