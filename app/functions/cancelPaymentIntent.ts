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

    const { payment_intent_id } = await req.json();

    if (!payment_intent_id) {
      return Response.json({ error: 'payment_intent_id requis' }, { status: 400 });
    }

    // Annuler le PaymentIntent sur Stripe
    try {
      await stripe.paymentIntents.cancel(payment_intent_id);
    } catch (error) {
      console.error('Erreur annulation PaymentIntent:', error);
      // Continue même en cas d'erreur (le PaymentIntent peut déjà être annulé)
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erreur annulation:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});