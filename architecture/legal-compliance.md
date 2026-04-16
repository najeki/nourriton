# Legal Compliance & Product Validation — Architecture SOP

**Goal**: Ensure Nourriton complies with French food safety regulations by validating basket contents and enforcing platform rules.

**Status**: Active  
**Owner**: System Pilot  
**Last Updated**: 2026-02-07

---

## 🎯 Overview

Nourriton operates as an **intermediary platform** (not a marketplace) connecting food surplus sellers with buyers. To minimize legal liability and ensure user safety, the platform must:

1. **Prohibit dangerous/illegal products** (raw meat, homemade meals, alcohol, etc.)
2. **Enforce seller declarations** (occasional vs professional)
3. **Maintain audit trails** (CGU acceptance, product validation logs)
4. **Display clear disclaimers** (platform = intermediary, not seller)

This SOP defines the validation rules and technical implementation.

---

## 📋 Legal Framework

### Platform Liability (French Law)

**Article 6.I.2 de la LCEN** (Loi pour la Confiance dans l'Économie Numérique):
- Platforms are **not liable** for user-generated content if they act as **neutral intermediaries**
- Liability protection requires:
  - No editorial control over listings
  - Prompt removal of illegal content when notified
  - Terms of Service (CGU) defining prohibited items

**Nourriton's Responsibility**:
- Define and enforce product restrictions
- Verify professional sellers (SIRET)
- Provide reporting mechanism (signalement)
- Act on reports within 24-48h

---

## 🚫 Prohibited Products

### Category 1: Health & Safety Risks
**Completely banned for ALL sellers**:

- ❌ **Homemade meals** (plats cuisinés maison)
  - *Reason*: No HACCP compliance, bacterial risk
  - *Keywords*: "fait maison", "cuisiné par moi", "recette de grand-mère"

- ❌ **Raw meat & poultry** (viande crue, volaille)
  - *Reason*: Cold chain requirements, salmonella risk
  - *Keywords*: "poulet cru", "steak", "viande hachée"

- ❌ **Raw fish & shellfish** (poisson cru, fruits de mer)
  - *Reason*: Rapid spoilage, parasites
  - *Keywords*: "poisson frais", "huîtres", "sushi"

- ❌ **Unpasteurized dairy** (dairy non pasteurisé)
  - *Reason*: Listeria risk
  - *Keywords*: "lait cru", "fromage au lait cru" (unless professional)

- ❌ **Infant food** (aliments pour bébés)
  - *Reason*: Strict safety standards
  - *Keywords*: "lait infantile", "purée bébé"

### Category 2: Regulated Products
**Allowed ONLY for professionals with proper licensing**:

- ⚠️ **Alcohol** (alcool)
  - *Reason*: Requires license (IV or III)
  - *Pro only*: SIRET + alcohol license proof

- ⚠️ **Raw milk cheese** (fromages au lait cru)
  - *Reason*: HACCP compliance required
  - *Pro only*: Must declare origin

### Category 3: Platform Policy
**Banned to maintain mission integrity**:

- ❌ **Non-food items** (objets non-alimentaires)
  - *Reason*: Off-mission
  - *Keywords*: "vêtements", "jouets", "électronique"

- ❌ **Expired products** (produits périmés)
  - *Reason*: Legal liability
  - *Keywords*: "périmé", "DLC dépassée"

---

## 🔧 Technical Implementation

### Validation Layers

**Layer 1**: Keyword scanning (pre-flight)  
**Layer 2**: Category classification (ML/rules)  
**Layer 3**: Manual review (flagged items)

---

### 1. Pre-Creation Validation

**When**: User submits basket creation form

```javascript
async function validateBasket(basketData) {
  const validator = new ProductValidator();
  
  // Scan title + description
  const scan = validator.scanForbiddenKeywords(
    basketData.title + ' ' + basketData.description
  );
  
  if (scan.forbidden) {
    return {
      valid: false,
      reason: 'forbidden_product',
      matches: scan.matches,
      message: `Produit interdit : ${scan.matches.join(', ')}`,
      suggestion: "Les plats cuisinés maison, viandes crues et produits périmés sont interdits.",
    };
  }
  
  // Check category restrictions
  const categoryCheck = validator.validateCategory(
    basketData.category,
    basketData.seller_status
  );
  
  if (!categoryCheck.allowed) {
    return {
      valid: false,
      reason: 'restricted_category',
      message: categoryCheck.message,
      upgrade_required: categoryCheck.requires_pro,
    };
  }
  
  // All checks passed
  return {
    valid: true,
    warnings: scan.warnings, // e.g., "Mention allergens if applicable"
  };
}
```

---

### 2. Forbidden Keywords Database

```javascript
const FORBIDDEN_KEYWORDS = {
  homemade_meals: [
    'fait maison', 'cuisiné par moi', 'recette de', 'plat préparé',
    'cuisine maison', 'mon plat', 'j\'ai cuisiné'
  ],
  
  raw_meat: [
    'viande crue', 'poulet cru', 'steak', 'viande hachée',
    'côtelette', 'bavette', 'entrecôte'
  ],
  
  raw_fish: [
    'poisson cru', 'sushi', 'sashimi', 'huîtres', 'coquillages',
    'fruits de mer crus'
  ],
  
  infant_food: [
    'lait infantile', 'purée bébé', 'nourriture bébé',
    'aliment pour nourrisson'
  ],
  
  expired: [
    'périmé', 'DLC dépassée', 'date dépassée', 'expiré'
  ],
  
  alcohol: [
    'vin', 'bière', 'alcool', 'spiritueux', 'vodka', 'whisky'
  ],
};

const WARNING_KEYWORDS = {
  allergens: [
    'arachide', 'cacahuète', 'gluten', 'lactose', 
    'œuf', 'soja', 'noix', 'sésame'
  ],
};
```

---

### 3. Category Restrictions

```javascript
const CATEGORY_RULES = {
  'fruits-legumes': {
    allowed_for: ['particulier', 'professionnel'],
    restrictions: [],
  },
  
  'pain-patisserie': {
    allowed_for: ['professionnel'], // HACCP required
    restrictions: ['Doit être emballé', 'Date de fabrication requise'],
  },
  
  'viande-poisson': {
    allowed_for: ['professionnel'],
    restrictions: ['Uniquement produits emballés', 'Traçabilité requise'],
  },
  
  'produits-laitiers': {
    allowed_for: ['particulier', 'professionnel'],
    restrictions: ['Lait cru interdit pour particuliers'],
  },
  
  'alcool': {
    allowed_for: ['professionnel'],
    restrictions: ['Licence requise', 'Preuve de licence IV/III'],
  },
};
```

---

### 4. Seller Status Verification

**When**: User creates first basket OR upgrades to professional

```javascript
async function verifySIRET(siret) {
  // Call French government API
  const response = await fetch(`https://api.insee.fr/entreprises/sirene/V3/siret/${siret}`, {
    headers: {
      'Authorization': `Bearer ${INSEE_API_KEY}`,
    },
  });
  
  if (!response.ok) {
    return { valid: false, error: 'SIRET invalide' };
  }
  
  const data = await response.json();
  
  return {
    valid: true,
    company_name: data.etablissement.uniteLegale.denominationUniteLegale,
    activity: data.etablissement.uniteLegale.activitePrincipaleUniteLegale,
    status: data.etablissement.etatAdministratifEtablissement, // A = active
  };
}
```

---

### 5. CGU Acceptance Tracking

**Data Model**:
```javascript
// user_acceptances table
{
  user_id: uuid,
  document_type: 'cgu' | 'privacy_policy' | 'vendor_terms',
  version: string,              // "1.0", "1.1", etc.
  accepted_at: timestamp,
  ip_address: string,           // For legal proof
  user_agent: string,
}
```

**Enforcement**:
```javascript
function canCreateBasket(userId) {
  const latestCGU = getLatestCGUVersion(); // e.g., "1.2"
  const userAcceptance = db.getUserAcceptance(userId, 'vendor_terms');
  
  if (!userAcceptance || userAcceptance.version !== latestCGU.version) {
    return {
      allowed: false,
      reason: 'cgu_not_accepted',
      message: 'Vous devez accepter les CGU Vendeur',
      cgu_url: '/legal/vendor-terms',
    };
  }
  
  return { allowed: true };
}
```

---

### 6. Reporting & Moderation

**User Reports**:
```javascript
// basket_reports table
{
  id: uuid,
  basket_id: uuid,
  reporter_id: uuid,
  reason: 'forbidden_product' | 'misleading_description' | 'expired' | 'other',
  description: text,
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed',
  reviewed_by: uuid | null,
  reviewed_at: timestamp | null,
}
```

**Admin Action**:
```javascript
async function handleReport(reportId) {
  const report = db.getReport(reportId);
  const basket = db.getBasket(report.basket_id);
  
  // Auto-suspend if high-risk keywords
  const validation = validateBasket(basket);
  if (!validation.valid && validation.reason === 'forbidden_product') {
    await db.updateBasket(basket.id, { 
      status: 'suspended',
      suspension_reason: 'forbidden_product_reported',
    });
    
    await notifyVendor(basket.vendor_id, {
      type: 'basket_suspended',
      message: `Votre panier "${basket.title}" a été suspendu suite à un signalement.`,
    });
  }
  
  // Mark for manual review
  db.updateReport(reportId, {
    status: 'action_taken',
    reviewed_at: Date.now(),
  });
}
```

---

## 🚨 Edge Cases & Error Handling

### 1. False Positives (Keyword Matching)
**Problem**: "Pain maison" flagged as homemade meal  
**Solution**: Context analysis
```javascript
if (matches('pain maison') && category === 'pain-patisserie' && status === 'professionnel') {
  // Allow (professional bakery)
}
```

### 2. Regional Variations
**Problem**: "Fromage fermier" (farm cheese) = raw milk?  
**Solution**: Require clarification
```javascript
if (matches('fromage fermier')) {
  return {
    valid: false,
    requires_clarification: true,
    question: "Ce fromage est-il au lait pasteurisé ou cru ?",
  };
}
```

### 3. Multi-Item Baskets
**Problem**: "Lot fruits + poulet cru"  
**Solution**: Scan all items separately
```javascript
basketData.items.forEach(item => {
  const check = validateProduct(item);
  if (!check.valid) {
    invalidItems.push(item.name);
  }
});
```

### 4. Language Variations
**Problem**: "Home-made lasagna" (English)  
**Solution**: Multi-language keyword list

---

## 📊 Monitoring & Analytics

**Metrics**:
- Rejection rate by category
- Most common forbidden keywords
- False positive rate (baskets suspended then reinstated)
- Reports per 1000 baskets
- Average moderation response time

**Alerts**:
- Spike in forbidden product attempts (fraud pattern)
- High rejection rate for specific seller (coaching needed)

---

## 🔐 Security & Privacy

1. **GDPR Compliance** — Store only necessary data (IP for legal proof)
2. **Anonymized Reporting** — Reporter identity hidden from vendor
3. **Audit Trail** — Log all validation decisions (legal defense)
4. **Right to Explanation** — Vendors can request review

---

## 📝 Testing Checklist

- [ ] Scan "Poulet rôti fait maison" → Rejected
- [ ] Scan "Pain de campagne" (professional) → Accepted
- [ ] Scan "Lot de pommes" → Accepted
- [ ] Scan "Vin rouge bio" (particulier) → Rejected (pro only)
- [ ] Scan "Vin rouge bio" (professionnel) → Accepted
- [ ] Create basket without CGU acceptance → Blocked
- [ ] Report basket → Admin notified
- [ ] False positive "Pain maison" → Manual review

---

## 📚 References

- [LCEN Article 6](https://www.legifrance.gouv.fr/)
- [DGCCRF Food Safety Guidelines](https://www.economie.gouv.fr/dgccrf)
- [INSEE SIRET API](https://api.insee.fr/catalogue/)
- Vinted's moderation system (benchmark)

---

## ✅ Compliance Checklist

- [x] Prohibited products defined
- [x] Keyword scanning implemented
- [x] Category restrictions enforced
- [x] SIRET verification planned
- [x] CGU tracking designed
- [x] Reporting mechanism defined
- [ ] Legal review by advisor
- [ ] DGCCRF consultation
