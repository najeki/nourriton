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

    const { transaction_id } = await req.json();

    // Récupérer la transaction
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];

    if (!transaction) {
      return Response.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    // Vérifier que l'utilisateur est bien l'acheteur
    if (transaction.buyer_id !== user.id) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier que la transaction n'est pas déjà complétée
    if (transaction.status === 'completed') {
      return Response.json({ error: 'Transaction déjà complétée' }, { status: 400 });
    }

    // Capturer le paiement sur Stripe
    if (transaction.payment_intent_id) {
      try {
        await stripe.paymentIntents.capture(transaction.payment_intent_id);
      } catch (error) {
        console.error('Erreur capture Stripe:', error);
        return Response.json({ error: 'Erreur lors de la capture du paiement' }, { status: 500 });
      }
    }

    // Marquer la transaction comme complétée
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      pickup_confirmed: true,
      pickup_confirmed_at: new Date().toISOString()
    });

    // Marquer le panier comme vendu
    await base44.asServiceRole.entities.Basket.update(transaction.basket_id, {
      status: 'sold'
    });

    // Mettre à jour les stats du vendeur
    const sellers = await base44.asServiceRole.entities.User.filter({ id: transaction.seller_id });
    if (sellers[0]) {
      await base44.asServiceRole.entities.User.update(transaction.seller_id, {
        baskets_sold: (sellers[0].baskets_sold || 0) + 1
      });
    }

    // Envoyer une notification email au vendeur
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: transaction.seller_id,
      subject: `💰 Paiement reçu pour "${transaction.basket_title}"`,
      body: `
Bonjour,

Le paiement pour votre panier "${transaction.basket_title}" a été confirmé !

L'acheteur ${transaction.buyer_name} a confirmé la récupération du panier.

💰 Montant reçu : ${(transaction.price * (transaction.seller_id.includes('commercant') ? 0.75 : 0.85)).toFixed(2)}€

Le virement sera effectué sur votre compte bancaire sous 2-7 jours ouvrés.

Merci d'utiliser Nourriton !
L'équipe Nourriton
      `
    });

    // Envoyer une notification email à l'acheteur
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: transaction.buyer_id,
      subject: `✅ Transaction confirmée : ${transaction.basket_title}`,
      body: `
Bonjour ${transaction.buyer_name},

Merci d'avoir confirmé la récupération de votre panier "${transaction.basket_title}" !

Votre paiement de ${transaction.price}€ a été effectué.

N'oubliez pas de laisser un avis sur le vendeur pour aider la communauté.

À très bientôt sur Nourriton !
L'équipe Nourriton
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erreur capture paiement:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});