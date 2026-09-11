import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Showcase } from '../showcase/showcase';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { PricingService } from '../services/pricing.service';
import carsData from '../data/cars.json';

@Component({
  selector: 'app-homepage',
  imports: [FormsModule, Showcase, RouterLink],
  templateUrl: './homepage.html',
  styleUrl: './homepage.css',
})
export class Homepage {
  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef,
    private pricing: PricingService
  ) {
    this.loadCars();
  }

  // ── Écran d'entrée / son V8 ──
  @ViewChild('v8Sound') v8Sound!: ElementRef<HTMLAudioElement>;
  introVisible = true;
  introClosing = false;

  enterSite(): void {
    if (this.introClosing) return; // évite le double-clic

    this.v8Sound?.nativeElement.play().catch((err) => {
      console.error('Erreur lecture audio :', err);
    });

    this.introClosing = true;

    setTimeout(() => {
      this.introVisible = false;
    }, 600);
  }

  menuOpen = false;

  searchQuery = '';
  activeFilter = 'all';
  filterMarque = '';
  filterCarburant = '';
  filterAnnee = '';
  filterBudget = '';
  // Catégorie recherche perso / stock Corée / stock France
  filterOrigine: '' | 'recherche-perso' | 'stock-coree' | 'stock-france' = '';
  cars: any[] = [];
  currentPage = 0;
  limit = 50;
  loading = false;
  selectedCar: any = null;

  isKorean(text: string): boolean {
    if (!text) return true;
    return /[\u3131-\uD79D\u1100-\u11FF]/.test(text);
  }

  cleanText(text: string): string {
    if (!text) return '';
    return text.replace(/[\u3131-\uD79D\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]/g, '').trim();
  }

  private getFallbackCars(): any[] {
    return [...(carsData as any[])].sort(() => Math.random() - 0.5);
  }

  private async fetchCarsFromSupabase(): Promise<any[]> {
    const marques = ['Hyundai', 'Kia', 'BMW', 'Porsche', 'Audi', 'Genesis', 'Toyota', 'Lexus', 'Volkswagen'];

    const results = await Promise.allSettled(
      marques.map(async (marque) => {
        const request = this.supabase.getCarsByMarque(marque, 6);
        const response = await Promise.race([
          request,
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Timeout Supabase pour ${marque}`)), 2500);
          }),
        ]);

        return response?.data || [];
      })
    );

    const allCars = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );

    return allCars.length > 0 ? allCars : this.getFallbackCars();
  }

  /**
   * Enrichit chaque véhicule avec son prix final calculé et son économie réalisée.
   * `prix` (brut, prix d'achat) reste en mémoire pour le calcul mais ne doit
   * jamais être bindé directement dans un template — utiliser `prixFinal`.
   */
  private enrichWithPricing(cars: any[]): any[] {
    return cars.map((c) => {
      const prixFinal = this.pricing.computePrixFinal(c.prix);
      const economie = c.prixMarche
        ? this.pricing.computeEconomie(c.prix, c.prixMarche)
        : null;
      return { ...c, prixFinal, economie };
    });
  }

  async loadCars(reset = false) {
    if (reset) { this.currentPage = 0; this.cars = []; }
    this.loading = true;

    try {
      const data = await this.fetchCarsFromSupabase();
      const shuffled = data.sort(() => Math.random() - 0.5);
      this.cars = this.enrichWithPricing(shuffled);
    } catch (error) {
      console.warn('Catalogue Supabase indisponible, utilisation du catalogue local.', error);
      this.cars = this.enrichWithPricing(this.getFallbackCars());
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  loadMore() {
    this.currentPage++;
    this.loadCars();
  }

  get filteredCars() {
    return this.cars.filter(c => {
      const matchMarque = !this.filterMarque || c.marque.toLowerCase() === this.filterMarque;
      const matchCarbu = !this.filterCarburant || c.carburant.toLowerCase() === this.filterCarburant;
      const matchAnnee = !this.filterAnnee || c.annee >= +this.filterAnnee;
      const matchBudget = !this.filterBudget || c.prixFinal <= +this.filterBudget;
      const matchOrigine = !this.filterOrigine || c.origine === this.filterOrigine;
      const matchFilter = this.activeFilter === 'all' || c.marque.toLowerCase() === this.activeFilter || c.carburant.toLowerCase() === this.activeFilter;
      const matchSearch = !this.searchQuery || (c.marque + ' ' + c.modele + ' ' + c.annee + ' ' + c.carburant).toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchMarque && matchCarbu && matchAnnee && matchBudget && matchOrigine && matchFilter && matchSearch;
    });
  }

  onHeroFilter() { this.activeFilter = 'all'; this.searchQuery = ''; }

  setFilter(f: string) {
    this.activeFilter = f;
    this.searchQuery = '';
    this.filterMarque = '';
    this.filterCarburant = '';
    this.filterAnnee = '';
    this.filterBudget = '';
  }

  setOrigine(o: '' | 'recherche-perso' | 'stock-coree' | 'stock-france') {
    this.filterOrigine = o;
  }

  formatKm(km: number) { return km.toLocaleString('fr-FR') + ' km'; }
  // Note : on formate toujours prixFinal, jamais le champ `prix` brut (prix d'achat)
  formatPrix(p: number) { return p.toLocaleString('fr-FR') + ' €'; }

  openModal(car: any) { this.router.navigate(['/voiture', car.id]); }
  closeModal() { this.selectedCar = null; }
}