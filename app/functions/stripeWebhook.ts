import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    // Créer le client base44 AVANT la validation de la signature
    const base44 = createClientFromRequest(req);

    // Vérifier la signature du webhook (ASYNC version pour Deno)
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Gérer les événements
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('Autorisation paiement réussie:', metadata);

      const basket = (await base44.asServiceRole.entities.Basket.filter({ id: metadata.basket_id }))[0];

      // Créer la transaction avec statut "pending" (en attente de confirmation de récupération)
      await base44.asServiceRole.entities.Transaction.create({
        basket_id: metadata.basket_id,
        basket_title: basket.title,
        seller_id: metadata.seller_id,
        seller_name: metadata.seller_name,
        buyer_id: metadata.buyer_id,
        buyer_name: metadata.buyer_name,
        price: session.amount_total / 100,
        status: 'pending', // En attente de confirmation de récupération
        payment_intent_id: session.payment_intent,
        pickup_date: basket.pickup_date,
        pickup_address: basket.pickup_address,
        pickup_confirmed: false,
      });

      // Mettre à jour le panier comme réservé (pas encore vendu)
      await base44.asServiceRole.entities.Basket.update(metadata.basket_id, {
        status: 'reserved',
        reserved_by: metadata.buyer_id,
        reserved_at: new Date().toISOString(),
      });

      // Créer une conversation automatique entre acheteur et vendeur
      const existingConvs = await base44.asServiceRole.entities.Conversation.filter({
        basket_id: metadata.basket_id,
        buyer_id: metadata.buyer_id
      });

      if (existingConvs.length === 0) {
        await base44.asServiceRole.entities.Conversation.create({
          basket_id: metadata.basket_id,
          basket_title: basket.title,
          buyer_id: metadata.buyer_id,
          buyer_name: metadata.buyer_name,
          seller_id: metadata.seller_id,
          seller_name: metadata.seller_name,
          last_message: "Panier réservé",
          last_message_at: new Date().toISOString(),
          unread_count_buyer: 0,
          unread_count_seller: 0
        });
      }

      // Envoyer une notification email à l'acheteur
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: metadata.buyer_id,
        subject: `✅ Panier réservé : ${basket.title}`,
        body: `
Bonjour ${metadata.buyer_name},

Votre panier "${basket.title}" a bien été réservé !

📍 Adresse de retrait : ${basket.pickup_address}
📅 Date : ${basket.pickup_date}
⏰ Horaire : ${basket.pickup_time_start} - ${basket.pickup_time_end}

⚠️ Important : Votre carte a été autorisée mais le paiement ne sera débité qu'après votre confirmation de récupération du panier.

Vous pouvez contacter le vendeur via la messagerie pour organiser la remise.

À bientôt,
L'équipe Nourriton
        `
      });

      // Envoyer une notification email au vendeur
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: metadata.seller_id,
        subject: `🎉 Votre panier a été réservé !`,
        body: `
Bonjour ${metadata.seller_name},

Bonne nouvelle ! Votre panier "${basket.title}" a été réservé par ${metadata.buyer_name}.

📍 Adresse de retrait : ${basket.pickup_address}
📅 Date : ${basket.pickup_date}
⏰ Horaire : ${basket.pickup_time_start} - ${basket.pickup_time_end}

💰 Prix : ${session.amount_total / 100}€
💵 Vous recevrez : ${metadata.seller_amount}€ (après commission de ${metadata.commission}€)

Le paiement sera effectué automatiquement lorsque l'acheteur confirmera la récupération du panier.

Vous pouvez contacter l'acheteur via la messagerie.

À bientôt,
L'équipe Nourriton
        `
      });

      console.log('Transaction créée avec autorisation en attente de confirmation');

      // Incrémenter le compteur de ventes pour les particuliers
      try {
        const seller = await base44.asServiceRole.entities.User.get(metadata.seller_id);
        if (seller && seller.seller_type === 'particulier') {
          await base44.asServiceRole.entities.User.update(metadata.seller_id, {
            sales_count: (seller.sales_count || 0) + 1
          });
          console.log(`Compteur de ventes incrémenté pour le vendeur ${metadata.seller_id}`);
        }
      } catch (err) {
        console.error('Erreur lors de l\'incrémentation du compteur de ventes:', err);
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('Session expirée:', metadata);

      // Remettre le panier disponible
      await base44.asServiceRole.entities.Basket.update(metadata.basket_id, {
        status: 'available',
        reserved_by: null,
        reserved_at: null,
      });

      console.log('Panier remis disponible');
    }

    // Gérer la mise à jour des comptes connectés (Stripe Connect)
    if (event.type === 'account.updated') {
      const account = event.data.object;
      console.log('Compte Stripe mis à jour:', account.id);

      // Trouver l'utilisateur lié à ce compte Stripe
      const users = await base44.asServiceRole.entities.User.filter({ stripe_account_id: account.id });

      if (users.length > 0) {
        const user = users[0];
        // On considère l'onboarding complet si les charges sont activées et les détails soumis
        const onboardingCompleted = account.charges_enabled && account.details_submitted;

        if (user.stripe_onboarding_completed !== onboardingCompleted) {
          await base44.asServiceRole.entities.User.update(user.id, {
            stripe_onboarding_completed: onboardingCompleted
          });
          console.log(`Statut onboarding mis à jour pour l'utilisateur ${user.id}: ${onboardingCompleted}`);
        }
      } else {
        console.warn(`Aucun utilisateur trouvé pour le compte Stripe ${account.id}`);
      }
    }

    // Gérer la création de transferts (payouts vers les vendeurs)
    if (event.type === 'transfer.created') {
      const transfer = event.data.object;
      console.log(`Transfert créé : ${transfer.amount / 100} ${transfer.currency.toUpperCase()} vers ${transfer.destination}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Erreur webhook:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});