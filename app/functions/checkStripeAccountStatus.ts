import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Récupérer le compte Stripe du vendeur
    const accounts = await base44.asServiceRole.entities.SellerStripeAccount.filter({
      seller_id: user.id
    });

    if (accounts.length === 0) {
      return Response.json({ 
        has_account: false,
        onboarding_completed: false 
      });
    }

    const sellerAccount = accounts[0];

    // Vérifier le statut sur Stripe
    const account = await stripe.accounts.retrieve(sellerAccount.stripe_account_id);

    // Mettre à jour dans la base de données
    await base44.asServiceRole.entities.SellerStripeAccount.update(sellerAccount.id, {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_completed: account.details_submitted && account.charges_enabled,
    });

    return Response.json({
      has_account: true,
      onboarding_completed: account.details_submitted && account.charges_enabled,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      stripe_account_id: sellerAccount.stripe_account_id,
    });
  } catch (error) {
    console.error('Erreur vérification compte Stripe:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});