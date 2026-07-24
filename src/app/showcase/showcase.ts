import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-showcase',
  imports: [CommonModule],
  templateUrl: './showcase.html',
  styleUrl: './showcase.css',
})
export class Showcase {
brands = [
  { nom: 'Kia', logo: 'https://www.carlogos.org/car-logos/kia-logo-2021.png' },
  { nom: 'Hyundai', logo: 'https://www.carlogos.org/car-logos/hyundai-logo.png' },
  { nom: 'Genesis', logo: 'https://www.carlogos.org/car-logos/genesis-logo.png' },
  { nom: 'Audi', logo: 'https://www.carlogos.org/car-logos/audi-logo.png' },
  { nom: 'BMW', logo: 'https://www.carlogos.org/car-logos/bmw-logo.png' },
  { nom: 'Mercedes', logo: 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png' },
  { nom: 'Volkswagen', logo: 'https://www.carlogos.org/car-logos/volkswagen-logo.png' },
  { nom: 'Toyota', logo: 'https://www.carlogos.org/car-logos/toyota-logo.png' },
  { nom: 'Porsche', logo: 'https://www.carlogos.org/car-logos/porsche-logo.png' },
  { nom: 'Tesla', logo: 'https://www.carlogos.org/car-logos/tesla-logo.png' },
  { nom: 'Lexus', logo: 'https://www.carlogos.org/car-logos/lexus-logo.png' },
];

  featured = [
    { marque: 'Genesis', modele: 'G80', annee: 2024, km: 5000, carburant: 'Essence', prix: 54900, emoji: '👑' },
    { marque: 'Kia', modele: 'Stinger GT', annee: 2022, km: 32000, carburant: 'Essence', prix: 34500, emoji: '🏎️' },
    { marque: 'Hyundai', modele: 'Ioniq 6', annee: 2024, km: 3000, carburant: 'Électrique', prix: 42000, emoji: '⚡' },
  ];

  formatKm(km: number) { return km.toLocaleString('fr-FR') + ' km'; }
  formatPrix(p: number) { return p.toLocaleString('fr-FR') + ' €'; }
}