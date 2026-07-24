import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-car-detail',
  imports: [FormsModule],
  templateUrl: './car-detail.html',
  styleUrl: './car-detail.css',
})
export class CarDetail implements OnInit {
  car: any = null;
  nom = '';
  email = '';
  telephone = '';
  message = '';
  sent = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    const id = +this.route.snapshot.paramMap.get('id')!;
    const { data } = await this.supabase.client
      .from('cars')
      .select('*')
      .eq('id', id)
      .single();
    this.car = data;
    this.cdr.detectChanges();
    if (!this.car) this.router.navigate(['/']);
  }

  isKorean(text: string): boolean {
    if (!text) return true;
    return /[\u3131-\uD79D\u1100-\u11FF]/.test(text);
  }

  cleanText(text: string): string {
    if (!text) return '';
    return text.replace(/[\u3131-\uD79D\u1100-\u11FF\uA960-\uA97F\uD7B0-\uD7FF]/g, '').trim();
  }

  formatKm(km: number) { return km.toLocaleString('fr-FR') + ' km'; }
  formatPrix(p: number) { return p.toLocaleString('fr-FR') + ' €'; }

  retour() { this.router.navigate(['/']); }

  envoyer() {
    if (!this.nom || !this.email) return;
    this.sent = true;
  }
}