/**
 * Configuration centralisée des commissions Nourriton
 * 
 * Ces taux sont appliqués automatiquement lors de chaque transaction
 * via Stripe Connect (application_fee_amount)
 */

export const COMMISSION_CONFIG = {
    /**
     * Commission pour les vendeurs particuliers (15%)
     * Appliquée sur chaque vente pour financer la plateforme
     */
    PARTICULIER_RATE: 0.15,

    /**
     * Commission pour les vendeurs professionnels (25%)
     * Taux commercial standard pour marketplaces B2C
     */
    PROFESSIONNEL_RATE: 0.25,

    /**
     * Calcule la commission pour une vente
     * @param price - Prix total du panier en euros
     * @param sellerType - Type de vendeur ('particulier' ou 'commercant')
     * @returns Objet contenant la commission et le montant net vendeur
     */
    calculateCommission(price: number, sellerType: string) {
        const rate = sellerType === 'commercant'
            ? this.PROFESSIONNEL_RATE
            : this.PARTICULIER_RATE;

        const commission = price * rate;
        const sellerAmount = price - commission;
        const applicationFeeAmount = Math.round(commission * 100); // Stripe utilise les centimes

        return {
            commission,
            commissionRate: rate,
            sellerAmount,
            applicationFeeAmount,
            breakdown: {
                totalPrice: price,
                commissionPercent: `${rate * 100}%`,
                commissionAmount: commission.toFixed(2),
                sellerReceives: sellerAmount.toFixed(2),
            }
        };
    },

    /**
     * Retourne un message explicatif pour l'utilisateur
     */
    getCommissionMessage(sellerType: string): string {
        const rate = sellerType === 'commercant' ? 25 : 15;
        const netRate = sellerType === 'commercant' ? 75 : 85;
        return `Commission Nourriton: ${rate}% (vous recevez ${netRate}% du prix)`;
    }
};

export default COMMISSION_CONFIG;
