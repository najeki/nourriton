# 📜 Project Constitution — gemini.md

> **The Law:** This file defines the immutable data schemas, behavioral rules, and architectural invariants for this project. Changes to this document require explicit approval.

---

## 🎯 Project Identity

**Project Name:** Nourriton (anciennement FeedMe)  
**North Star:** Réduire le gaspillage alimentaire en permettant la redistribution locale de surplus à prix solidaire  
**Slogan:** "Rien ne se perd, tout se partage"  
**Created:** 2026-02-07  
**Last Updated:** 2026-02-07

### Positionnement
- Plateforme de redistribution solidaire (pas marketplace commerciale)
- Dignité avant tout : pas de vocabulaire de charité ou d'aide
- Local, humain, direct

---

## 📊 Data Schemas

### Users (Utilisateurs)
```json
{
  "id": "uuid",
  "nom": "string",
  "email": "string",
  "role": "particulier | professionnel | admin",
  "localisation": {"lat": "float", "lng": "float"},
  "note_moyenne": "float",
  "statut_vendeur": "occasionnel | professionnel",
  "ventes_ce_mois": "integer",
  "date_creation": "timestamp"
}
```

### Paniers (Surplus Alimentaires)
```json
{
  "id": "uuid",
  "vendeur_id": "uuid",
  "titre": "string",
  "description": "string",
  "photo_url": "string",
  "prix": "decimal",
  "localisation": {"lat": "float", "lng": "float", "adresse": "string"},
  "date_retrait": "timestamp",
  "creneau_retrait": "string",
  "statut": "disponible | reserve | vendu | annule",
  "type_produits": "array<string>",
  "created_at": "timestamp"
}
```

### Maraudes (Événements Solidaires)
```json
{
  "id": "uuid",
  "organisateur_id": "uuid",
  "titre": "string",
  "description": "string",
  "lieu_depart": {"lat": "float", "lng": "float", "adresse": "string"},
  "date_heure": "timestamp",
  "duree_estimee": "integer (minutes)",
  "places_max": "integer | null",
  "participants": "array<uuid>",
  "statut": "a_venir | en_cours | terminee | annulee",
  "type_besoin": "repas | distribution | logistique",
  "created_at": "timestamp"
}
```

### Transactions
```json
{
  "id": "uuid",
  "panier_id": "uuid",
  "acheteur_id": "uuid",
  "vendeur_id": "uuid",
  "montant": "decimal",
  "statut": "pending | completed | refunded | disputed",
  "stripe_payment_intent": "string",
  "created_at": "timestamp"
}
```

---

## ⚙️ Behavioral Rules

**Acting Principles:**
- **Dignité** : Aider sans pointer du doigt. Jamais "personnes démunies" ou "charité"
- **Occasionnalité** : Limiter les ventes particuliers à X/mois pour préserver le caractère non-professionnel
- **Transparence** : Statut vendeur toujours visible (badge Particulier / Professionnel)
- **Sécurité** : Liste claire des produits autorisés/interdits
- **Responsabilité** : Vendeur seul responsable de la qualité/sécurité

**Do Not:**
- Ne jamais utiliser "aide alimentaire", "charité", "personnes démunies"
- Ne jamais permettre la vente de : plats cuisinés maison, viandes/poissons crus, laitages non emballés, alcool, aliments nourrissons
- Ne jamais agir comme vendeur/distributeur (rôle = intermédiaire uniquement)
- Ne jamais laisser un particulier dépasser la limite mensuelle sans alerte

---

## 🏗️ Architectural Invariants

### File Structure
```
├── gemini.md          # This file - Project Constitution
├── task_plan.md       # Phases, goals, checklists
├── findings.md        # Research, discoveries, constraints
├── progress.md        # Execution log
├── .env               # API Keys/Secrets
├── architecture/      # Layer 1: SOPs (Markdown How-Tos)
├── tools/             # Layer 3: Python Scripts (Execution Engines)
└── .tmp/              # Temporary Workbench (Ephemeral)
```

### Integration Points
- **External Services:** 
  - **Stripe** (paiements - blocage actuel : compte entrepreneur requis)
  - **Géolocalisation** (Google Maps / Mapbox)
  - **Notifications** (Firebase / OneSignal)
  - **Stockage images** (Cloudinary / AWS S3)
- **Source of Truth:** Base de données Supabase (users, paniers, maraudes, transactions)
- **Delivery Target:** 
  - **App mobile** : iOS/Android (React Native / Flutter)
  - **App web** : Next.js deployment (Netlify)

---

## 📝 Maintenance Log

### 2026-02-07 17:33
- **Action:** Intégration des specs Nourriton depuis conversation ChatGPT
- **Status:** Schémas définis, blocage technique Stripe identifié
- **Prochaine étape:** Résoudre Stripe Connect (Express + individual accounts)

### 2026-02-07 17:21
- **Action:** Protocol 0 initialization
- **Status:** Fichiers mémoire créés
