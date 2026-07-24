import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Showcase } from '../showcase/showcase';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

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
    private cdr: ChangeDetectorRef
  ) {
    this.loadCars();
  }

menuOpen = false;

  searchQuery = '';
  activeFilter = 'all';
  filterMarque = '';
  filterCarburant = '';
  filterAnnee = '';
  filterBudget = '';
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

  async loadCars(reset = false) {
    if (reset) { this.currentPage = 0; this.cars = []; }
    this.loading = true;

    const marques = ['Hyundai', 'Kia', 'BMW', 'Porsche', 'Audi', 'Genesis', 'Toyota', 'Lexus', 'Volkswagen'];
    let allCars: any[] = [];

    for (const marque of marques) {
      const { data } = await this.supabase.getCarsByMarque(marque, 6);
      allCars = [...allCars, ...(data || [])];
    }

    this.cars = allCars.sort(() => Math.random() - 0.5);
    this.loading = false;
    this.cdr.detectChanges();
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
      const matchBudget = !this.filterBudget || c.prix <= +this.filterBudget;
      const matchFilter = this.activeFilter === 'all' || c.marque.toLowerCase() === this.activeFilter || c.carburant.toLowerCase() === this.activeFilter;
      const matchSearch = !this.searchQuery || (c.marque + ' ' + c.modele + ' ' + c.annee + ' ' + c.carburant).toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchMarque && matchCarbu && matchAnnee && matchBudget && matchFilter && matchSearch;
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

  formatKm(km: number) { return km.toLocaleString('fr-FR') + ' km'; }
  formatPrix(p: number) { return p.toLocaleString('fr-FR') + ' €'; }

  openModal(car: any) { this.router.navigate(['/voiture', car.id]); }
  closeModal() { this.selectedCar = null; }
}