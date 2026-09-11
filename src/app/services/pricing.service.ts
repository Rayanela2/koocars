import { Injectable } from '@angular/core';

/**
 * ⚠️ À AJUSTER avec Rayan avant mise en prod — 3 constantes en attente de confirmation :
 * - TVA_RATE et TVA_BASE (sur quoi elle s'applique)
 * - BENEFICE (montant fixe vs pourcentage)
 * - Source du prix marché pour le calcul de l'économie réalisée
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  // --- Constantes à confirmer ---
  private readonly DEDOUANEMENT_RATE = 0.10; // 10%, appliqué sur le prix d'achat (à confirmer)
  private readonly TVA_RATE = 0.20; // à confirmer : 20% sur quelle base ?
  private readonly LIVRAISON_FIXE = 1500; // € par véhicule
  private readonly FRAIS_ANNEXE = 0; // TODO: montant à définir
  private readonly FRAIS_COLLABORATEUR_MIN = 800;
  private readonly FRAIS_COLLABORATEUR_MAX = 1200;
  private readonly BENEFICE_FIXE = 0; // TODO: montant ou % à définir

  computePrixFinal(prixAchat: number): number {
    const dedouanement = prixAchat * this.DEDOUANEMENT_RATE;
    const fraisCollaborateur = (this.FRAIS_COLLABORATEUR_MIN + this.FRAIS_COLLABORATEUR_MAX) / 2;

    const coutTotal =
      prixAchat +
      dedouanement +
      this.LIVRAISON_FIXE +
      this.FRAIS_ANNEXE +
      fraisCollaborateur;

    const tva = coutTotal * this.TVA_RATE;

    return Math.round(coutTotal + tva + this.BENEFICE_FIXE);
  }

  computeEconomie(prixAchat: number, prixMarche: number): { montant: number; pourcentage: number } {
    const prixFinal = this.computePrixFinal(prixAchat);
    const montant = Math.max(0, prixMarche - prixFinal);
    const pourcentage = prixMarche > 0 ? Math.round((montant / prixMarche) * 100) : 0;
    return { montant, pourcentage };
  }
}
