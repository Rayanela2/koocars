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

  // ⬇️ Adresse qui reçoit les messages du formulaire (remplace par la vraie)
  private readonly EMAIL_DESTINATAIRE = 'koocars93@gmail.com';

  async envoyer() {
    if (!this.nom || !this.telephone) return;

    try {
      await fetch(`https://formsubmit.co/ajax/${this.EMAIL_DESTINATAIRE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Nouveau message KOOCARS - ${this.nom}`,
          nom: this.nom,
          telephone: this.telephone,
          email: this.email,
          message: this.message,
        }),
      });
    } catch {
      // on affiche quand même la confirmation, l'utilisateur a le téléphone/WhatsApp en secours
    }
    this.sent = true;
  }
}