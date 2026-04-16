# 🔍 Findings — Research, Discoveries, Constraints

> **Purpose:** This file captures all research, discoveries, and constraints encountered during the project lifecycle. It serves as the institutional memory for technical decisions.

---

## 2026-02-07: Project Initialization

### Environment
- **Workspace:** `/Users/nathankinsola/Nourriton`
- **OS:** macOS
- **Agent:** Antigravity (Google DeepMind)

### Context Discovered
From conversation history analysis:
- User has existing projects: "Union Heart OS" deployed on Netlify
- Previous work with Supabase (auth), Stripe (payments), Zapier MCP
- Experience with Next.js Server Actions and deployment configuration

### Available MCP Servers
- Netlify
- Pinecone
- Stripe
- Supabase
- Zapier

---

## Discovery Questions (Answered via ChatGPT conversation)

### 1. North Star ✅
**Question:** What is the singular desired outcome for this project?  
**Answer:** Réduire le gaspillage alimentaire en facilitant la redistribution locale de surplus à prix solidaire, tout en préservant la dignité des personnes.

### 2. Integrations ✅
**Question:** Which external services do we need? Are API keys ready?  
**Answer:** 
- **Stripe** (paiements - problème actuel : force création compte entrepreneur)
- **Géolocalisation** (Maps API)
- **Notifications push**
- **Stockage images**
- **Backend** : probablement Supabase (vu historique conversations)

### 3. Source of Truth ✅
**Question:** Where does the primary data live?  
**Answer:** Database relationnelle (Users, Paniers, Maraudes, Transactions, Avis)

### 4. Delivery Payload ✅
**Question:** How and where should the final result be delivered?  
**Answer:** 
- **Application mobile** (iOS/Android) via App Store / Play Store
- **Application web** (Next.js déployé sur Netlify)

### 5. Behavioral Rules ✅
**Question:** How should the system "act"? (Tone, logic constraints, "Do Not" rules)  
**Answer:** 
- **Ton** : Solidaire, chaleureux, non stigmatisant
- **Interdictions** : Vocabulaire de charité, produits dangereux (viandes crues, plats maison, etc.)
- **Principe** : Dignité > Pitié

---

## 🧠 Analyse Complète du Projet (depuis ChatGPT)

### Identité de Marque
- **Nom** : Nourriton (ex-FeedMe)
- **Slogan principal** : "Rien ne se perd, tout se partage"
- **Alternatives** : "Des surplus qui nourrissent", "Nourrir plutôt que jeter"
- **Palette couleurs** :
  - Vert doux #5FA777 (vie, confiance)
  - Crème chaud #F6F3EE (humanité)
  - Brun terre #5C4632 (local, authenticité)
  - Orange léger #F4A261 (action, CTA)
- **Typographie** : Poppins (boutons/titres), Inter (texte)

### Fonctionnalités Clés

#### Module Paniers
- Création de panier (photo, description, prix, lieu, date retrait)
- Géolocalisation et recherche par distance
- Réservation/achat
- Historique transactions
- Notation vendeurs
- Signalement abus

#### Module Maraudes 🆕
- Création d'événements solidaires locaux
- **Carte interactive** avec marqueurs géolocalisés
- Inscription/participation
- Notifications (nouvelle maraude, rappel départ)
- Statuts : à venir / en cours / terminée
- Filtres : distance, date, places disponibles

### Cadre Juridique (très important)

#### Particuliers
- ✅ Vente **occasionnelle** de surplus personnels (légal)
- ❌ Vente **régulière/habituelle** sans statut (illégal)
- **Solution** : Limiter nb ventes/mois + alerte requalification

#### Professionnels
- Statut obligatoire (micro-entrepreneur, etc.)
- Obligations HACCP, traçabilité, allergènes
- Badge "Pro" visible
- Pas de limitation de fréquence

#### Produits
- ✅ **Autorisés** : fruits/légumes, produits secs, emballés, pain/viennoiseries
- ❌ **Interdits** : plats maison, viandes/poissons crus, laitages non emballés, alcool, aliments nourrissons

#### Responsabilité Plateforme
- Rôle = **intermédiaire** uniquement (pas vendeur/distributeur)
- Obligation de vigilance
- Clauses CGU cruciales :
  - Déclaration occasionnalité
  - Responsabilité sanitaire vendeur
  - Limitation fréquence
  - Produits interdits

### Micro-copy & UX
- "Récupérer ce panier" (pas "acheter")
- "Je participe" (maraudes)
- "Merci, ce panier ne sera pas jeté"
- Jamais : "aide alimentaire", "charité", "personnes démunies"

---

## 🚨 Blocage Technique Actuel

### Problème Stripe
**Constat** : Stripe force les vendeurs particuliers à créer un "compte entrepreneur"

**Cause probable** : Utilisation de Stripe Connect **Standard** (compte autonome avec dashboard)

**Solution recommandée** :
1. Migrer vers **Stripe Connect Express** ou **Custom**
2. Utiliser `business_type: "individual"` (pas "company")
3. Le vendeur ne crée pas de compte Stripe standalone
4. KYC géré via Connect Onboarding (identité + IBAN uniquement)
5. L'expérience reste dans l'app Nourriton

**Conformité App Store** :
- Biens physiques (paniers) → paiement externe à IAP = ✅ autorisé
- Stripe est compatible (guideline 3.1.1)

### Inspiration Vinted
- Séparation claire Particulier/Pro
- Badge visible
- Paiement séquestré (escrow) + Protection acheteur
- Fenêtre de dispute/remboursement
- Déclaration sur l'honneur occasionnalité

---

## 🔍 Existing Codebase Analysis (`nourriton-2`)

### Tech Stack Confirmed
**Framework**: Base44 (opinionated React framework)
- **Frontend**: React 18 + Vite
- **Styling**: TailwindCSS + Radix UI components
- **Forms**: react-hook-form + Zod validation
- **State**: @tanstack/react-query
- **Routing**: react-router-dom
- **Maps**: react-leaflet (Leaflet.js)
- **Payments**: @stripe/react-stripe-js
- **Backend**: Base44 SDK (@base44/sdk)

### Existing Pages (13 total)
1. **Home.jsx** - Liste des paniers disponibles
2. **Maraudes.jsx** - Carte + liste des maraudes
3. **CreateMaraude.jsx** - Création maraude
4. **MaraudeDetail.jsx** - Détail d'une maraude
5. **CreateBasket.jsx** - Création panier
6. **BasketDetail.jsx** - Détail panier
7. **MyBaskets.jsx** - Mes paniers vendus/achetés
8. **Transactions.jsx** - Historique transactions
9. **Profile.jsx** - Profil utilisateur (30KB - complexe)
10. **SellerProfile.jsx** - Profil vendeur public
11. **Messages.jsx** - Messagerie
12. **Favorites.jsx** - Paniers favoris
13. **Admin.jsx** - Panneau admin (28KB - complexe)

### Project Location
- **Original**: `/Users/nathankinsola/Desktop/nourriton-2`
- **Workspace**: `/Users/nathankinsola/Nourriton/app` (copié)

### Missing Configuration
- ❌ Pas de `.env.local` (requis pour Base44)
- Variables nécessaires:
  ```
  VITE_BASE44_APP_ID=<app_id>
  VITE_BASE44_APP_BASE_URL=<backend_url>
  ```

### Key Dependencies
- `@base44/sdk: ^0.8.3` - Backend integration
- `@stripe/react-stripe-js: ^3.0.0` - Paiements
- `react-leaflet: ^4.2.1` - Cartes (Maraudes)
- `framer-motion: ^11.16.4` - Animations
- `lucide-react: ^0.475.0` - Icons

### Architecture Observation
✅ **Bonne nouvelle**: L'app suit déjà une architecture propre
- Components séparés (voir `/src/components`)
- API calls centralisés (voir `/src/api`)
- Hooks réutilisables (voir `/src/hooks`)
- Utils helpers (voir `/src/utils`)

### Next Steps B.L.A.S.T.
1. **Phase 2 (Link)**: Configurer `.env.local` + tester Base44 backend
2. **Phase 3 (Architect)**: Créer SOPs pour Stripe Connect Express
3. **Phase 3 (Architect)**: Ajouter limitation ventes particuliers
4. **Phase 4 (Stylize)**: Review UX/micro-copy dignité

---

## Technical Constraints

[To be populated as discoveries are made]

---

## API Research

[To be populated with external service documentation findings]

---

## Lessons Learned

[To be populated with self-annealing insights from errors and fixes]
