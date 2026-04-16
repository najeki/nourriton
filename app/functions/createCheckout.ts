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

    const { basket_id } = await req.json();

    // Récupérer le panier
    const baskets = await base44.asServiceRole.entities.Basket.filter({ id: basket_id });
    const basket = baskets[0];

    if (!basket || basket.status !== 'available') {
      return Response.json({ error: 'Panier non disponible' }, { status: 400 });
    }

    if (basket.seller_id === user.id) {
      return Response.json({ error: 'Vous ne pouvez pas acheter votre propre panier' }, { status: 400 });
    }

    // Vérifier que le vendeur a un compte Stripe Connect
    const sellerAccounts = await base44.asServiceRole.entities.SellerStripeAccount.filter({
      seller_id: basket.seller_id
    });

    if (sellerAccounts.length === 0 || !sellerAccounts[0].onboarding_completed) {
      return Response.json({
        error: 'Le vendeur n\'a pas encore configuré son compte de paiement'
      }, { status: 400 });
    }

    const sellerStripeAccountId = sellerAccounts[0].stripe_account_id;

    // Calculer la commission de plateforme
    // Particuliers: 15% | Professionnels: 25%
    const price = basket.price;
    const isCommercant = basket.seller_type === 'commercant';
    const commissionRate = isCommercant ? 0.25 : 0.15;
    const commission = price * commissionRate;
    const sellerAmount = price - commission;
    const applicationFeeAmount = Math.round(commission * 100); // en centimes

    // Créer une session Checkout Stripe avec capture manuelle
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: basket.title,
              description: basket.description || 'Panier anti-gaspi',
              images: basket.photo_url ? [basket.photo_url] : [],
            },
            unit_amount: Math.round(price * 100), // en centimes
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: sellerStripeAccountId,
        },
        capture_method: 'manual', // IMPORTANT: Capture manuelle
      },
      success_url: `${req.headers.get('origin')}/Transactions?success=true`,
      cancel_url: `${req.headers.get('origin')}/BasketDetail?id=${basket_id}`,
      metadata: {
        basket_id: basket.id,
        buyer_id: user.id,
        buyer_name: user.full_name,
        seller_id: basket.seller_id,
        seller_name: basket.seller_name,
        seller_stripe_account_id: sellerStripeAccountId,
        commission: commission.toFixed(2),
        seller_amount: sellerAmount.toFixed(2),
      },
    });

    // Réserver le panier temporairement
    await base44.asServiceRole.entities.Basket.update(basket_id, {
      status: 'reserved',
      reserved_by: user.id,
      reserved_at: new Date().toISOString(),
    });

    return Response.json({
      checkout_url: session.url,
      session_id: session.id
    });
  } catch (error) {
    console.error('Erreur création checkout:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});