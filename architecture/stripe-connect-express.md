# Stripe Connect Express — Architecture SOP

**Goal**: Enable individual vendors (particuliers) to receive payments via Stripe Connect Express without creating a business entity.

**Status**: Active  
**Owner**: System Pilot  
**Last Updated**: 2026-02-07

---

## 🎯 Overview

This SOP defines how Nourriton integrates **Stripe Connect Express** to enable:
- **Particuliers** (individuals) to sell food surplus without company registration
- Secure payment collection and transfer
- Automated vendor onboarding with KYC compliance
- Monthly sales tracking for legal compliance

---

## 📋 Requirements

### Input
- User email (validated)
- User country (default: `FR`)
- User type: `particulier` or `professionnel`

### Output
- Stripe Account ID
- Onboarding URL (for KYC)
- Account verification status
- Transfer capability status

---

## 🔧 Technical Implementation

### 1. Create Express Account

**When**: User clicks "Become a Vendor" or creates first basket

**API Call**:
```javascript
const account = await stripe.accounts.create({
  type: 'express',
  country: 'FR',
  email: vendor.email,
  business_type: 'individual', // KEY: not "company"
  capabilities: {
    transfers: { requested: true },
  },
  individual: {
    email: vendor.email,
    // Stripe will collect other details via onboarding
  },
});
```

**Response**:
```json
{
  "id": "acct_1234567890",
  "type": "express",
  "business_type": "individual",
  "email": "vendor@example.com",
  "charges_enabled": false,
  "payouts_enabled": false,
  "capabilities": {
    "transfers": "inactive"
  }
}
```

**Store in DB**:
```javascript
// Update user record
user.stripe_account_id = account.id;
user.stripe_account_status = 'pending';
user.vendor_status = 'particulier';
```

---

### 2. Generate Onboarding Link

**When**: Immediately after account creation

**API Call**:
```javascript
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://nourriton.app/vendor/reauth',
  return_url: 'https://nourriton.app/vendor/success',
  type: 'account_onboarding',
});
```

**Response**:
```json
{
  "object": "account_link",
  "created": 1649361600,
  "expires_at": 1649448000,
  "url": "https://connect.stripe.com/setup/e/acct_1234567890/..."
}
```

**Action**: Redirect vendor to `accountLink.url`

**⚠️ Important**: Link expires in 24h. If vendor doesn't complete, regenerate link.

---

### 3. Handle Onboarding Completion

**When**: Stripe redirects to `return_url`

**Check Account Status**:
```javascript
const account = await stripe.accounts.retrieve(accountId);

if (account.charges_enabled && account.payouts_enabled) {
  // Update DB
  user.stripe_account_status = 'verified';
  user.can_create_baskets = true;
} else {
  // Still pending verification
  user.stripe_account_status = 'pending';
}
```

**Verification Statuses**:
- `pending` - Onboarding not started or incomplete
- `verified` - Fully verified, can receive payments
- `suspended` - Account flagged by Stripe (fraud, compliance)

---

### 4. Process Payment (Basket Purchase)

**When**: Buyer purchases basket

**Flow**:
1. Buyer pays via Stripe Checkout/Payment Intent
2. Nourriton holds funds (escrow)
3. Buyer confirms basket pickup
4. Nourriton transfers funds to vendor

**Create Payment Intent**:
```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: basket.price * 100, // cents
  currency: 'eur',
  automatic_payment_methods: { enabled: true },
  application_fee_amount: platformFee * 100, // Nourriton commission
  transfer_data: {
    destination: vendor.stripe_account_id,
  },
  metadata: {
    basket_id: basket.id,
    vendor_id: vendor.id,
    buyer_id: buyer.id,
  },
});
```

**Alternative (Direct Charge)**:
```javascript
// If using Stripe Connect direct charges
const charge = await stripe.charges.create({
  amount: basket.price * 100,
  currency: 'eur',
  source: paymentMethodId,
  application_fee_amount: platformFee * 100,
}, {
  stripeAccount: vendor.stripe_account_id,
});
```

---

### 5. Transfer Funds to Vendor

**When**: Basket marked as "picked up" by buyer

**API Call**:
```javascript
const transfer = await stripe.transfers.create({
  amount: (basket.price - platformFee) * 100,
  currency: 'eur',
  destination: vendor.stripe_account_id,
  transfer_group: `basket_${basket.id}`,
  metadata: {
    basket_id: basket.id,
    vendor_id: vendor.id,
  },
});
```

**Update DB**:
```javascript
transaction.status = 'completed';
transaction.stripe_transfer_id = transfer.id;
vendor.monthly_sales_count += 1; // For limit tracking
```

---

### 6. Handle Disputes/Refunds

**When**: Buyer reports issue with basket

**Refund API**:
```javascript
const refund = await stripe.refunds.create({
  payment_intent: paymentIntent.id,
  reverse_transfer: true, // Reverses transfer to vendor
  metadata: {
    dispute_reason: 'basket_not_as_described',
  },
});
```

**Update DB**:
```javascript
transaction.status = 'refunded';
basket.status = 'disputed';
vendor.monthly_sales_count -= 1; // Rollback count
```

---

## 🔔 Webhooks

**Required Webhook Events**:

### `account.updated`
```javascript
// Vendor account status changed
if (event.data.object.charges_enabled) {
  db.updateUser(accountId, { stripe_account_status: 'verified' });
}
```

### `payment_intent.succeeded`
```javascript
// Payment captured, update DB
db.createTransaction({
  basket_id: metadata.basket_id,
  amount: event.data.object.amount / 100,
  status: 'pending_pickup',
});
```

### `transfer.created`
```javascript
// Funds sent to vendor
db.updateTransaction(transferGroup, {
  status: 'completed',
  completed_at: Date.now(),
});
```

### `account.application.deauthorized`
```javascript
// Vendor disconnected account
db.updateUser(accountId, {
  stripe_account_id: null,
  stripe_account_status: null,
  can_create_baskets: false,
});
```

---

## 🚨 Edge Cases & Error Handling

### Account Creation Fails
**Cause**: Invalid email, country not supported, API key issue  
**Action**: Show user-friendly error, log to monitoring

### Onboarding Not Completed
**Cause**: Vendor abandons flow, missing documents  
**Action**: Send reminder email after 48h, regenerate onboarding link

### Transfer Fails
**Cause**: Vendor account suspended, insufficient balance  
**Action**: 
1. Notify vendor to fix account
2. Hold funds in escrow
3. Retry transfer after 24h
4. If still failing after 7 days, refund buyer

### Monthly Sales Limit Reached (Particuliers)
**Cause**: Vendor exceeds 10 sales/month  
**Action**:
1. Block new basket creation
2. Show upgrade prompt: "Become Professional Vendor"
3. If upgraded, remove limit

### Account Flagged by Stripe
**Cause**: Fraud detection, compliance issue  
**Action**:
1. Suspend vendor account
2. Contact vendor for resolution
3. Pause all active baskets

---

## 📊 Data Tracking

**User Table Fields**:
```javascript
{
  stripe_account_id: string | null,
  stripe_account_status: 'pending' | 'verified' | 'suspended' | null,
  vendor_status: 'particulier' | 'professionnel' | null,
  monthly_sales_count: number,
  last_sales_reset: timestamp,
  can_create_baskets: boolean,
}
```

**Transaction Table**:
```javascript
{
  id: uuid,
  basket_id: uuid,
  buyer_id: uuid,
  vendor_id: uuid,
  amount: decimal,
  platform_fee: decimal,
  stripe_payment_intent: string,
  stripe_transfer_id: string | null,
  status: 'pending_payment' | 'pending_pickup' | 'completed' | 'refunded' | 'disputed',
  created_at: timestamp,
  completed_at: timestamp | null,
}
```

---

## 🔐 Security Considerations

1. **Never expose secret API key** in frontend
2. **Validate webhook signatures** using Stripe signature header
3. **Store account IDs securely**, never in localStorage
4. **Use HTTPS only** for onboarding redirects
5. **Implement rate limiting** on account creation (prevent abuse)

---

## 📝 Testing Checklist

- [ ] Create test Express account (individual)
- [ ] Complete onboarding in test mode
- [ ] Verify account status updates correctly
- [ ] Create test payment intent
- [ ] Process test transfer
- [ ] Test refund flow
- [ ] Verify webhook handling
- [ ] Test monthly sales limit logic
- [ ] Test account suspension scenario

---

## 📚 References

- [Stripe Connect Express Docs](https://stripe.com/docs/connect/express-accounts)
- [Account API Reference](https://stripe.com/docs/api/accounts)
- [Connect Onboarding](https://stripe.com/docs/connect/onboarding)
- [Transfers API](https://stripe.com/docs/api/transfers)

---

## ✅ Approval Status

- [x] Technical design reviewed
- [ ] Tested in Stripe test mode
- [ ] Legal compliance verified
- [ ] Production deployment approved
