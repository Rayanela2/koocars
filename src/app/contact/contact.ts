import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  constructor(private router: Router) {}

  nom = '';
  email = '';
  telephone = '';
  message = '';
  sent = false;

  retour() { this.router.navigate(['/']); }

  envoyer() {
    if (!this.nom || !this.telephone) return;
    this.sent = true;
  }
}