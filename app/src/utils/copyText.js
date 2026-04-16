/**
 * Centralized Copy Text for Nourriton
 * Following the "Dignité" principle: No charity language, preserve dignity
 */

export const COPY = {
  // Call-to-Actions
  cta: {
    getBasket: "Récupérer ce panier",
    createBasket: "Proposer un surplus",
    joinMaraude: "Je participe",
    becomeVendor: "Devenir vendeur",
    upgradeToPro: "Passer professionnel",
    connectBankAccount: "Connecter mon compte bancaire",
  },

  // Success Messages
  success: {
    basketCreated: "Merci ! Ce panier ne sera pas jeté 🌱",
    basketRecovered: "Merci de contribuer au partage",
    maraudeJoined: "Merci, votre présence compte",
    accountConnected: "Compte bancaire connecté",
  },

  // Warnings
  warnings: {
    salesLimitApproaching: (current, limit) => 
      `Attention : ${current}/${limit} ventes ce mois. Vous approchez de la limite pour particuliers.`,
    salesLimitReached: 
      "Limite atteinte (10 ventes/mois). Pour continuer, passez professionnel.",
    needBankAccount: 
      "Connectez votre compte bancaire dans votre profil pour proposer des surplus.",
  },

  // Errors
  errors: {
    mustConnectBank: "Vous devez d'abord connecter votre compte bancaire",
    productNotAllowed: "Ce type de produit n'est pas autorisé pour votre statut vendeur",
    basketNotFound: "Panier introuvable",
  },

  // Labels
  labels: {
    vendor: "Vendeur",
    particulier: "Particulier",
    professionnel: "Professionnel",
    monthlyLimit: "Limite mensuelle",
    salesThisMonth: "Ventes ce mois",
    surplus: "Surplus",
    redistribution: "Redistribution solidaire",
    limitedBudget: "Budget limité",
  },

  // Descriptions
  descriptions: {
    noBaskets: "Vous n'avez pas encore créé de panier. Commencez à proposer vos surplus alimentaires !",
    noFavorites: "Aucun favori pour le moment",
    bankAccountRequired: 
      "Vous devez connecter votre compte bancaire dans votre profil pour proposer des surplus et recevoir vos paiements.",
    bankAccountBenefit: "Obligatoire pour proposer des surplus sur la plateforme",
    particulierStatus: "Vous pouvez proposer jusqu'à 10 ventes par mois en tant que particulier.",
    professionnelStatus: "Statut professionnel : ventes illimitées.",
  },

  // Vendor Status Badge
  badge: {
    particulier: "Particulier",
    professionnel: "Pro",
    salesCounter: (count, limit) => `${count}/${limit}`,
  },
};

export default COPY;
