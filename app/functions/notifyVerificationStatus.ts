import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, status, notes } = await req.json();

    // Get user info
    const users = await base44.asServiceRole.entities.User.filter({ id: userId });
    const targetUser = users[0];

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Send email notification
    if (status === 'approved') {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: targetUser.email,
        subject: '✅ Votre compte commerçant a été vérifié !',
        body: `
Bonjour ${targetUser.full_name || ''},

Excellente nouvelle ! Votre compte commerçant a été vérifié avec succès.

Vous pouvez maintenant :
• Publier des paniers anti-gaspi
• Vendre vos surplus alimentaires
• Participer à la lutte contre le gaspillage

Connectez-vous à votre compte pour commencer à créer vos premiers paniers.

Merci de faire partie de la communauté Nourriton !

L'équipe Nourriton
        `
      });
    } else if (status === 'rejected') {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: targetUser.email,
        subject: '❌ Votre demande de vérification commerçant',
        body: `
Bonjour ${targetUser.full_name || ''},

Nous avons examiné votre demande de vérification en tant que commerçant.

Malheureusement, nous ne pouvons pas valider votre compte pour le moment.

${notes ? `Motif : ${notes}` : ''}

Vous pouvez soumettre une nouvelle demande avec des documents mis à jour depuis votre profil.

Si vous avez des questions, n'hésitez pas à nous contacter.

L'équipe Nourriton
        `
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});