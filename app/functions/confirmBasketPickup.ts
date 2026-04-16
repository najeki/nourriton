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

        if (!basket_id) {
            return Response.json({ error: 'Basket ID required' }, { status: 400 });
        }

        // 1. Récupérer le panier
        const baskets = await base44.asServiceRole.entities.Basket.filter({ id: basket_id });
        const basket = baskets[0];

        if (!basket) {
            return Response.json({ error: 'Panier introuvable' }, { status: 404 });
        }

        // 2. Vérifier que l'utilisateur est bien celui qui a réservé (l'acheteur)
        // OU le vendeur (si on permet au vendeur de valider, mais le modèle escrow préfère l'acheteur)
        // Pour l'instant, on autorise l'acheteur à confirmer la réception.
        if (basket.reserved_by !== user.id) {
            return Response.json({ error: 'Seul l\'acheteur peut confirmer la réception' }, { status: 403 });
        }

        // 3. Récupérer la transaction associée
        const transactions = await base44.asServiceRole.entities.Transaction.filter({
            basket_id: basket_id,
            status: 'pending' // On cherche la transaction en attente
        });

        if (transactions.length === 0) {
            // C'est peut-être un don (pas de transaction financière ou transaction status succeeded directe)
            // Vérifions si c'est un panier gratuit
            if (basket.price === 0) {
                // Pour un don, on passe direct le panier en "sold"
                await base44.asServiceRole.entities.Basket.update(basket_id, {
                    status: 'sold',
                    sold_at: new Date().toISOString()
                });
                return Response.json({ success: true, message: 'Réception confirmée (Don)' });
            }
            return Response.json({ error: 'Aucune transaction en attente trouvée' }, { status: 404 });
        }

        const transaction = transactions[0];

        // 4. Capturer le paiement Stripe (si PaymentIntent existe)
        if (transaction.payment_intent_id) {
            try {
                const paymentIntent = await stripe.paymentIntents.capture(transaction.payment_intent_id);
                if (paymentIntent.status !== 'succeeded') {
                    throw new Error('Le paiement n\'a pas pu être capturé.');
                }
            } catch (stripeError) {
                // Si déjà capturé, on continue, sinon erreur
                if (stripeError.code !== 'payment_intent_unexpected_state') {
                    console.error('Stripe capture error:', stripeError);
                    return Response.json({ error: 'Erreur lors de la capture du paiement' }, { status: 500 });
                }
            }
        }

        // 5. Mettre à jour la transaction
        await base44.asServiceRole.entities.Transaction.update(transaction.id, {
            status: 'completed',
            pickup_confirmed: true,
            pickup_confirmed_at: new Date().toISOString()
        });

        // 6. Mettre à jour le panier en "Vendu"
        await base44.asServiceRole.entities.Basket.update(basket_id, {
            status: 'sold',
            sold_at: new Date().toISOString()
        });

        return Response.json({ success: true });

    } catch (error) {
        console.error('Erreur confirmation réception:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
