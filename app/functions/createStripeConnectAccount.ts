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

    // Vérifier si le vendeur a déjà un compte Stripe
    const existingAccounts = await base44.asServiceRole.entities.SellerStripeAccount.filter({
      seller_id: user.id
    });

    let stripeAccountId;

    if (existingAccounts.length > 0) {
      stripeAccountId = existingAccounts[0].stripe_account_id;
    } else {
      // Créer un nouveau compte Stripe Connect
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: user.seller_type === 'commercant' ? 'company' : 'individual',
      });

      stripeAccountId = account.id;

      // Sauvegarder dans la base de données
      await base44.asServiceRole.entities.SellerStripeAccount.create({
        seller_id: user.id,
        stripe_account_id: stripeAccountId,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_completed: false,
      });
    }

    // Créer un lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${req.headers.get('origin')}/Profile?stripe_refresh=true`,
      return_url: `${req.headers.get('origin')}/Profile?stripe_success=true`,
      type: 'account_onboarding',
    });

    return Response.json({ 
      url: accountLink.url,
      account_id: stripeAccountId
    });
  } catch (error) {
    console.error('Erreur création compte Stripe:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});