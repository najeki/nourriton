import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function should be called by a scheduled automation
    // Get all pending transactions where pickup date has passed and not confirmed
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const transactions = await base44.asServiceRole.entities.Transaction.filter({
      status: 'pending',
      pickup_confirmed: false
    });

    const overdueTransactions = transactions.filter(t => t.pickup_date <= yesterdayStr);

    for (const transaction of overdueTransactions) {
      // Get buyer info
      const buyers = await base44.asServiceRole.entities.User.filter({ id: transaction.buyer_id });
      const buyer = buyers[0];

      if (!buyer) continue;

      // Send email reminder
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: buyer.email,
        subject: '⏰ Avez-vous récupéré votre panier ?',
        body: `
Bonjour ${buyer.full_name || ''},

Votre date de retrait prévue pour le panier "${transaction.basket_title}" est maintenant passée.

Pourriez-vous confirmer si vous avez bien récupéré ce panier ?

🔹 Si vous l'avez récupéré : Connectez-vous pour confirmer le retrait
🔹 Si le vendeur n'était pas présent : Signalez le problème

Cela nous aide à maintenir la confiance sur la plateforme et à identifier les vendeurs peu fiables.

Merci de votre participation !

L'équipe Nourriton
        `
      });
    }

    return Response.json({ 
      success: true,
      reminders_sent: overdueTransactions.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});