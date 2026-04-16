# Configuration des Commissions Nourriton

## 💰 Taux de Commission

Nourriton prélève une commission sur chaque vente pour financer la plateforme et assurer sa pérennité.

### Taux Appliqués

| Type de Vendeur | Commission | Montant Vendeur |
|----------------|------------|-----------------|
| **Particulier** | **15%** | 85% du prix |
| **Professionnel** | **25%** | 75% du prix |

### Exemples de Calcul

#### Particulier - Panier à 10€
- Prix total: **10,00€**
- Commission Nourriton (15%): **1,50€**
- Montant reçu par le vendeur: **8,50€**

#### Professionnel - Panier à 20€
- Prix total: **20,00€**
- Commission Nourriton (25%): **5,00€**
- Montant reçu par le vendeur: **15,00€**

---

## ⚙️ Implémentation Technique

### Stripe Connect - Application Fees

Les commissions sont prélevées automatiquement via Stripe Connect avec le modèle `application_fee_amount`:

```typescript
// Dans createCheckout.ts
const commissionRate = isCommercant ? 0.25 : 0.15;
const commission = price * commissionRate;

payment_intent_data: {
  application_fee_amount: Math.round(commission * 100), // en centimes
  transfer_data: {
    destination: sellerStripeAccountId,
  },
}
```

### Flux de Paiement

1. **Acheteur paie 100%** du prix du panier
2. **Stripe prélève automatiquement** la commission (15% ou 25%)
3. **Vendeur reçoit** le montant net (85% ou 75%)
4. **Nourriton reçoit** la commission sur le compte platform

---

## 📊 Justification des Taux

### Particuliers (15%)
- Taux réduit pour encourager les particuliers à partager leurs surplus
- Compatible avec le modèle "redistribution solidaire"
- Couvre les frais de transaction Stripe (~2%) + fonctionnement plateforme

### Professionnels (25%)
- Taux commercial standard pour B2C marketplaces
- Justifié par le volume potentiel et le caractère professionnel
- Couvre frais Stripe + support + fonctionnalités avancées

---

## 📝 Transparence

Les commissions sont clairement affichées:
- ✅ Mentionnées dans les CGU/CGV
- ✅ Visibles dans le tableau de bord vendeur
- ✅ Détaillées dans chaque reçu de transaction
- ✅ Calculées en temps réel lors de la création de panier

---

## 🔧 Configuration dans le Code

**Fichier**: `app/functions/createCheckout.ts`

**Lignes 42-49**: Logique de calcul des commissions

**Variables d'environnement**: Aucune - Taux codés en dur pour stabilité

---

## ⚖️ Conformité Légale

- Taux conformes à la réglementation française sur les marketplaces
- Factures automatiques générées par Stripe
- TVA gérée séparément selon le statut du vendeur
- Commission distincte du prix de vente (transparence fiscale)
