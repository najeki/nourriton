# Sales Limitation for Particuliers — Architecture SOP

**Goal**: Enforce monthly sales limits for individual vendors (particuliers) to ensure legal compliance with occasional, non-professional selling.

**Status**: Active  
**Owner**: System Pilot  
**Last Updated**: 2026-02-07

---

## 🎯 Overview

French law allows individuals to sell goods **occasionally** without registering as a business. For food redistribution, Nourriton must prevent particuliers from becoming de-facto professionals by:

1. **Tracking monthly sales** (reset every 1st of month)
2. **Warning at threshold** (e.g., 8/10 sales)
3. **Blocking at limit** (10 sales/month)
4. **Offering professional upgrade** (if user wants to continue)

This SOP defines the technical implementation and business rules.

---

## 📋 Legal Context

### French Regulations

**Article 293 B du CGI** (Code Général des Impôts):
- Occasional sales by individuals are exempt from VAT/business registration
- "Occasional" = not habitual, not main source of income
- No strict legal definition of "occasional frequency"

**Nourriton's Interpretation**:
- **≤10 sales/month** = Occasional (safe zone)
- **>10 sales/month** = Professional activity (requires business registration)

**Platform Responsibility**:
- Act as intermediary (not marketplace)
- Implement "reasonable measures" to prevent abuse
- Document compliance in CGU (Terms of Service)

---

## 🔧 Technical Implementation

### Data Model

**User Table Fields**:
```javascript
{
  vendor_status: 'particulier' | 'professionnel' | null,
  monthly_sales_count: number,        // Current month counter
  last_sales_reset: timestamp,         // Last reset date
  sales_limit: number,                 // Default: 10
  sales_warning_threshold: number,     // Default: 8
  account_suspended: boolean,          // Limit reached
  suspension_reason: string | null,
}
```

**Sales History Table** (for audit trail):
```javascript
{
  id: uuid,
  vendor_id: uuid,
  basket_id: uuid,
  sale_date: timestamp,
  month_year: string,              // "2026-02"
  counted_toward_limit: boolean,   // false if refunded
}
```

---

### 1. Initialize Vendor Counter

**When**: User upgrades to vendor status

```javascript
// On first basket creation
if (!user.vendor_status) {
  db.updateUser(userId, {
    vendor_status: 'particulier',
    monthly_sales_count: 0,
    last_sales_reset: Date.now(),
    sales_limit: 10,
    sales_warning_threshold: 8,
    account_suspended: false,
  });
}
```

---

### 2. Check Limit Before Basket Creation

**When**: User clicks "Create Basket"

**Pre-flight validation**:
```javascript
function canCreateBasket(userId) {
  const user = db.getUser(userId);
  
  // Reset counter if new month
  if (isNewMonth(user.last_sales_reset)) {
    resetMonthlySales(userId);
    user.monthly_sales_count = 0;
  }
  
  // Check if limit reached
  if (user.vendor_status === 'particulier') {
    if (user.monthly_sales_count >= user.sales_limit) {
      return {
        allowed: false,
        reason: 'monthly_limit_reached',
        limit: user.sales_limit,
        current_count: user.monthly_sales_count,
      };
    }
    
    // Warning threshold
    if (user.monthly_sales_count >= user.sales_warning_threshold) {
      return {
        allowed: true,
        warning: true,
        message: `Attention : ${user.monthly_sales_count}/${user.sales_limit} ventes ce mois-ci`,
      };
    }
  }
  
  return { allowed: true };
}
```

**UI Implementation**:
```javascript
// In CreateBasket.jsx
const checkLimit = async () => {
  const result = await api.canCreateBasket(userId);
  
  if (!result.allowed) {
    showAlert({
      title: "Limite mensuelle atteinte",
      message: `Vous avez atteint la limite de ${result.limit} ventes par mois pour les particuliers.`,
      actions: [
        { label: "Devenir Pro", onClick: () => upgradeToPro() },
        { label: "Annuler", onClick: () => close() }
      ]
    });
    return false;
  }
  
  if (result.warning) {
    showWarning(result.message);
  }
  
  return true;
};
```

---

### 3. Increment Counter After Sale

**When**: Payment succeeded (webhook `payment_intent.succeeded`)

```javascript
function incrementSalesCounter(vendorId, basketId) {
  const user = db.getUser(vendorId);
  
  // Reset if new month
  if (isNewMonth(user.last_sales_reset)) {
    resetMonthlySales(vendorId);
  }
  
  // Increment
  db.updateUser(vendorId, {
    monthly_sales_count: user.monthly_sales_count + 1,
  });
  
  // Log to history
  db.createSalesHistory({
    vendor_id: vendorId,
    basket_id: basketId,
    sale_date: Date.now(),
    month_year: getCurrentMonthYear(), // "2026-02"
    counted_toward_limit: true,
  });
  
  // Check if limit reached
  if (user.monthly_sales_count + 1 >= user.sales_limit) {
    db.updateUser(vendorId, {
      account_suspended: true,
      suspension_reason: 'monthly_limit_reached',
    });
    
    sendNotification(vendorId, {
      type: 'limit_reached',
      message: "Limite mensuelle atteinte. Passez Pro pour continuer.",
    });
  }
  
  // Warning threshold
  else if (user.monthly_sales_count + 1 >= user.sales_warning_threshold) {
    sendNotification(vendorId, {
      type: 'warning',
      message: `Attention : ${user.monthly_sales_count + 1}/${user.sales_limit} ventes ce mois-ci`,
    });
  }
}
```

---

### 4. Handle Refunds (Decrement Counter)

**When**: Payment refunded (webhook `charge.refunded`)

```javascript
function handleRefund(vendorId, basketId) {
  const user = db.getUser(vendorId);
  
  // Decrement if refund in same month
  const saleHistory = db.getSalesHistory(basketId);
  if (saleHistory && saleHistory.month_year === getCurrentMonthYear()) {
    db.updateUser(vendorId, {
      monthly_sales_count: Math.max(0, user.monthly_sales_count - 1),
    });
    
    // Mark as not counted
    db.updateSalesHistory(basketId, {
      counted_toward_limit: false,
    });
    
    // Lift suspension if was blocked
    if (user.account_suspended && user.suspension_reason === 'monthly_limit_reached') {
      db.updateUser(vendorId, {
        account_suspended: false,
        suspension_reason: null,
      });
      
      sendNotification(vendorId, {
        type: 'suspension_lifted',
        message: "Votre compte a été réactivé suite au remboursement.",
      });
    }
  }
}
```

---

### 5. Reset Monthly Counter (Scheduled)

**When**: 1st of each month at midnight (cron: `0 0 1 * *`)

```javascript
function resetAllMonthlySales() {
  const vendors = db.getVendors({ vendor_status: 'particulier' });
  
  vendors.forEach(vendor => {
    db.updateUser(vendor.id, {
      monthly_sales_count: 0,
      last_sales_reset: Date.now(),
      account_suspended: false,
      suspension_reason: null,
    });
  });
  
  console.log(`Reset ${vendors.length} vendor counters for new month`);
}
```

**Implementation**:
- Base44 Function: `functions/reset-monthly-sales.js`
- Or: CRON job on server
- Or: Lazy reset (check on each operation)

---

### 6. Upgrade to Professional

**When**: User clicks "Become Professional Vendor"

**Requirements**:
- Business registration number (SIRET)
- Company name
- Legal structure (SARL, SAS, auto-entrepreneur, etc.)

**Flow**:
```javascript
async function upgradeToProfessional(userId, businessData) {
  // Validate SIRET (13 digits)
  if (!isValidSIRET(businessData.siret)) {
    throw new Error('SIRET invalide');
  }
  
  // Update user
  db.updateUser(userId, {
    vendor_status: 'professionnel',
    business_siret: businessData.siret,
    business_name: businessData.name,
    business_type: businessData.type,
    monthly_sales_count: 0,  // Reset counter
    sales_limit: null,        // No limit for pros
    account_suspended: false,
  });
  
  // Re-create Stripe account if needed
  // (Pros may need different Stripe account type)
  
  sendNotification(userId, {
    type: 'upgrade_success',
    message: "Compte professionnel activé. Vous pouvez vendre sans limite.",
  });
}
```

---

## 🚨 Edge Cases & Error Handling

### 1. **User Creates Multiple Baskets Simultaneously**
**Problem**: Race condition, counter not updated in time  
**Solution**: Use database transactions/locks
```javascript
await db.transaction(async (tx) => {
  const user = await tx.getUser(userId, { lock: true });
  if (user.monthly_sales_count >= user.sales_limit) {
    throw new Error('Limit reached');
  }
  await tx.createBasket(basketData);
});
```

### 2. **Month Reset Timing**
**Problem**: User at 9/10 sells at 23:59, then at 00:01 (should reset)  
**Solution**: Always check `isNewMonth()` before any operation

### 3. **Refund from Previous Month**
**Problem**: Refund in March for sale in February  
**Solution**: Don't decrement if `saleHistory.month_year !== currentMonth`

### 4. **Account Suspension Display**
**Problem**: User sees "suspended" without context  
**Solution**: Show upgrade CTA immediately
```javascript
if (user.account_suspended) {
  return (
    <Alert variant="warning">
      <p>Limite mensuelle atteinte ({user.sales_limit} ventes/mois)</p>
      <Button onClick={upgradeToPro}>Passer Pro (illimité)</Button>
      <Text>Vos limites se réinitialiseront le 1er du mois prochain.</Text>
    </Alert>
  );
}
```

### 5. **Fraudulent Behavior**
**Problem**: User creates new account to bypass limit  
**Solution**: 
- Track by email, phone, IBAN
- Flag suspicious patterns (same IBAN, same address)
- Manual review for repeated violations

---

## 📊 Monitoring & Analytics

**Metrics to Track**:
- Average sales/month per particulier
- % particuliers reaching warning threshold
- % particuliers reaching limit
- Conversion rate: Limit → Professional upgrade
- Refund rate impact on counters

**Alerts**:
- Spike in limit-reached events (fraud detection)
- SIRET validation failures
- Counter reset failures

---

## 🔐 Security Considerations

1. **Server-side enforcement** — Never trust client-side validation
2. **Audit trail** — Log every counter change (compliance proof)
3. **Immutable history** — Sales history table append-only
4. **Rate limiting** — Prevent rapid basket creation abuse

---

## 📝 Testing Checklist

- [ ] Create basket as particulier (counter increments)
- [ ] Create 8th basket (warning shows)
- [ ] Create 10th basket (success)
- [ ] Try 11th basket (blocked)
- [ ] Refund recent sale (counter decrements)
- [ ] Refund old sale from previous month (counter unchanged)
- [ ] Wait for month reset (counter resets to 0)
- [ ] Upgrade to pro (limit removed)
- [ ] Verify audit trail completeness

---

## 📚 References

- [Article 293 B CGI](https://www.legifrance.gouv.fr/)
- [DGCCRF Guidelines on Occasionnal Sales](https://www.economie.gouv.fr/dgccrf)
- Vinted's "Pro Badge" system (best practice reference)

---

## ✅ Compliance Checklist

- [x] Legal interpretation documented
- [x] Counter reset logic defined
- [x] Warning threshold implemented
- [x] Hard limit enforced
- [x] Professional upgrade path defined
- [ ] Tested in production environment
- [ ] Legal review by advisor
