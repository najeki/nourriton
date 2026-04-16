import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { basket_id } = await req.json();

        // 1. Récupérer le panier
        const baskets = await base44.asServiceRole.entities.Basket.filter({ id: basket_id });
        const basket = baskets[0];

        if (!basket || basket.status !== 'available') {
            return Response.json({ error: 'Panier non disponible' }, { status: 400 });
        }

        if (basket.seller_id === user.id) {
            return Response.json({ error: 'Vous ne pouvez pas réserver votre propre panier' }, { status: 400 });
        }

        // 2. Vérifier que c'est bien un DON (prix = 0)
        // On accepte aussi les prix très bas ou nuls si l'intention est un don, 
        // mais pour l'instant on se base sur basket.price == 0 ou le flag is_donation si on l'avait stocké.
        // Ici on assume que si le client appelle cette route, c'est pour un don.
        // Par sécurité, on peut vérifier que le prix est 0.
        if (basket.price > 0) {
            return Response.json({ error: 'Ce panier n\'est pas gratuit. Veuillez utiliser le paiement.' }, { status: 400 });
        }

        // 3. Réserver le panier (Status 'reserved' mais sans transaction financière Stripe)
        await base44.asServiceRole.entities.Basket.update(basket_id, {
            status: 'reserved',
            reserved_by: user.id,
            reserved_at: new Date().toISOString(),
        });

        // 4. Créer une transaction interne pour l'historique (montant 0)
        // Utile pour les stats et le suivi
        await base44.asServiceRole.entities.Transaction.create({
            amount: 0,
            currency: 'EUR',
            status: 'succeeded', // Pas de paiement à attendre
            basket_id: basket_id,
            buyer_id: user.id,
            seller_id: basket.seller_id,
            type: 'donation', // Nouveau type si supporté, sinon 'payment'
            metadata: {
                is_donation: true
            }
        });

        // 5. Créer une conversation entre donneur et receveur
        let conversations = await base44.asServiceRole.entities.Conversation.filter({
            basket_id: basket_id,
            participant_ids: { $all: [user.id, basket.seller_id] }
        });

        let conversationId;
        if (conversations.length > 0) {
            conversationId = conversations[0].id;
        } else {
            const conv = await base44.asServiceRole.entities.Conversation.create({
                basket_id: basket_id,
                participant_ids: [user.id, basket.seller_id],
                last_message_at: new Date().toISOString()
            });
            conversationId = conv.id;
        }

        // 6. Envoyer un message automatique
        await base44.asServiceRole.entities.Message.create({
            conversation_id: conversationId,
            sender_id: user.id,
            content: "Bonjour ! Je souhaite récupérer ce panier que vous donnez. Quand seriez-vous disponible ?",
            read_by: [user.id]
        });

        return Response.json({
            success: true,
            conversation_id: conversationId
        });

    } catch (error) {
        console.error('Error reserving donation:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
