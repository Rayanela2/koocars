import { Injectable } from '@angular/core';

/**
 * Régime de la TVA sur la marge (véhicules d'occasion importés, achetés sans
 * TVA récupérable) : la TVA ne s'applique JAMAIS sur le prix d'achat.
 * Elle est calculée uniquement sur la marge (bénéfice KOOCARS), qui varie
 * elle-même entre MARGE_MIN et MARGE_MAX selon le prix d'achat du véhicule.
 *
 * ⚠️ À AJUSTER avec Rayan avant mise en prod — constantes en attente de confirmation :
 * - Les seuils de prix d'achat (PRIX_SEUIL_BAS / PRIX_SEUIL_HAUT) qui définissent
 *   l'échelle de marge (actuellement calés sur les 10e/90e centiles du catalogue)
 * - Source du prix marché pour le calcul de l'économie réalisée
 * (FRAIS_ANNEXE confirmé à 1 200 €)
 */
@Injectable({ providedIn: 'root' })
export class PricingService {
  // --- Constantes à confirmer ---
  private readonly DEDOUANEMENT_RATE = 0.10; // 10%, appliqué sur le prix d'achat (à confirmer)
  private readonly TVA_RATE = 0.20; // TVA sur la marge uniquement (20%)
  private readonly LIVRAISON_FIXE = 1500; // € par véhicule
  private readonly FRAIS_ANNEXE = 1200; // € par véhicule
  private readonly FRAIS_COLLABORATEUR_MIN = 800;
  private readonly FRAIS_COLLABORATEUR_MAX = 1200;

  // Marge (bénéfice HT) : varie linéairement entre MARGE_MIN et MARGE_MAX
  // selon le prix d'achat, entre les deux seuils ci-dessous (bornée au-delà).
  private readonly MARGE_MIN = 3000;
  private readonly MARGE_MAX = 6500;
  private readonly PRIX_SEUIL_BAS = 5000; // en dessous : marge = MARGE_MIN
  private readonly PRIX_SEUIL_HAUT = 65000; // au-dessus : marge = MARGE_MAX

  /** Marge HT (bénéfice) adaptée au prix d'achat, entre 3 000 € et 6 500 €. */
  computeMarge(prixAchat: number): number {
    const ecartSeuils = this.PRIX_SEUIL_HAUT - this.PRIX_SEUIL_BAS;
    const progression = (prixAchat - this.PRIX_SEUIL_BAS) / ecartSeuils;
    const progressionBornee = Math.min(1, Math.max(0, progression));
    return this.MARGE_MIN + progressionBornee * (this.MARGE_MAX - this.MARGE_MIN);
  }

  computePrixFinal(prixAchat: number): number {
    const dedouanement = prixAchat * this.DEDOUANEMENT_RATE;
    const fraisCollaborateur = (this.FRAIS_COLLABORATEUR_MIN + this.FRAIS_COLLABORATEUR_MAX) / 2;
    const marge = this.computeMarge(prixAchat);

    // Frais réels (dédouanement, livraison, collaborateur) : refacturés au
    // coût, sans TVA. Seule la marge (bénéfice) porte la TVA sur la marge.
    const fraisSansTva = dedouanement + this.LIVRAISON_FIXE + this.FRAIS_ANNEXE + fraisCollaborateur;
    const tva = marge * this.TVA_RATE;

    return Math.round(prixAchat + fraisSansTva + marge + tva);
  }

  computeEconomie(prixAchat: number, prixMarche: number): { montant: number; pourcentage: number } {
    const prixFinal = this.computePrixFinal(prixAchat);
    const montant = Math.max(0, prixMarche - prixFinal);
    const pourcentage = prixMarche > 0 ? Math.round((montant / prixMarche) * 100) : 0;
    return { montant, pourcentage };
  }
}
