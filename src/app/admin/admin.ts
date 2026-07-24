import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
})
export class Admin {
  // AUTH
  email = '';
  password = '';
  isLoggedIn = false;
  loginError = '';

  // FORM VOITURE
  marque = '';
  modele = '';
  annee: number = 2024;
  km: number = 0;
  carburant = 'Essence';
  prix: number = 0;
  badge = '';
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  loading = false;
  success = false;
  error = '';

  // LISTE
  cars: any[] = [];

  constructor(private supabase: SupabaseService, private router: Router) {}

  async login() {
    const { error } = await this.supabase.signIn(this.email, this.password);
    if (error) {
      this.loginError = 'Email ou mot de passe incorrect';
    } else {
      this.isLoggedIn = true;
      this.loadCars();
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.isLoggedIn = false;
    this.router.navigate(['/']);
  }

  async loadCars() {
    const { data } = await this.supabase.getCars();
    this.cars = data || [];
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.photoPreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  async addCar() {
    if (!this.marque || !this.modele || !this.prix) {
      this.error = 'Marque, modèle et prix sont obligatoires';
      return;
    }
    this.loading = true;
    this.error = '';

    let photoUrl = '';

    if (this.selectedFile) {
      const path = `${Date.now()}_${this.selectedFile.name}`;
      const { error: uploadError } = await this.supabase.uploadPhoto(this.selectedFile, path);
      if (!uploadError) {
        photoUrl = this.supabase.getPhotoUrl(path);
      }
    }

    const { error } = await this.supabase.addCar({
      marque: this.marque,
      modele: this.modele,
      annee: this.annee,
      km: this.km,
      carburant: this.carburant,
      prix: this.prix,
      badge: this.badge,
      photo: photoUrl,
    });

    if (error) {
      this.error = 'Erreur lors de l\'ajout : ' + error.message;
    } else {
      this.success = true;
      this.resetForm();
      this.loadCars();
      setTimeout(() => this.success = false, 3000);
    }
    this.loading = false;
  }

  async deleteCar(id: number) {
    await this.supabase.deleteCar(id);
    this.loadCars();
  }

  resetForm() {
    this.marque = '';
    this.modele = '';
    this.annee = 2024;
    this.km = 0;
    this.carburant = 'Essence';
    this.prix = 0;
    this.badge = '';
    this.selectedFile = null;
    this.photoPreview = null;
  }

  formatPrix(p: number) { return p.toLocaleString('fr-FR') + ' €'; }
  formatKm(km: number) { return km.toLocaleString('fr-FR') + ' km'; }
}