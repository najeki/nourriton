import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Product Validator - Validates basket products for legal compliance
 * Prevents forbidden items from being listed (homemade meals, raw meat, alcohol for particuliers, etc.)
 */

const FORBIDDEN_KEYWORDS = {
    homemade_meals: [
        /\bfait maison\b/i,
        /\bcuisiné par moi\b/i,
        /\brecette de\b/i,
        /\bplat préparé\b/i,
        /\bcuisine maison\b/i,
    ],
    raw_meat: [
        /\bviande crue\b/i,
        /\bpoulet cru\b/i,
        /\bsteak\b/i,
        /\bviande hachée\b/i,
    ],
    raw_fish: [
        /\bpoisson cru\b/i,
        /\bsushi\b/i,
        /\bsashimi\b/i,
        /\bhuîtres\b/i,
    ],
    infant_food: [
        /\blait infantile\b/i,
        /\bnourriture bébé\b/i,
    ],
    expired: [
        /\bpérimé\b/i,
        /\bDLC dépassée\b/i,
        /\bdate dépassée\b/i,
        /\bexpiré\b/i,
    ],
    alcohol: [
        /\bvin\b/i,
        /\bbière\b/i,
        /\balcool\b/i,
        /\bvodka\b/i,
        /\bwhisky\b/i,
        /\bchampagne\b/i,
    ],
};

const CATEGORY_RULES = {
    'pain-patisserie': {
        allowed_for: ['commercant'],
        restrictions: ['Doit être emballé', 'Date de fabrication requise'],
    },
    'viande-poisson': {
        allowed_for: ['commercant'],
        restrictions: ['Uniquement produits emballés', 'Traçabilité requise'],
    },
    'alcool': {
        allowed_for: ['commercant'],
        restrictions: ['Licence requise'],
    },
};

function scanForbiddenKeywords(text: string) {
    const textLower = text.toLowerCase();
    const forbiddenMatches: string[] = [];

    for (const [category, patterns] of Object.entries(FORBIDDEN_KEYWORDS)) {
        for (const pattern of patterns) {
            if (pattern.test(textLower)) {
                forbiddenMatches.push(category.replace('_', ' '));
                break;
            }
        }
    }

    return {
        forbidden: forbiddenMatches.length > 0,
        matches: [...new Set(forbiddenMatches)],
    };
}

function validateCategory(category: string, sellerType: string) {
    const rules = CATEGORY_RULES[category];

    if (!rules) {
        return { allowed: true };
    }

    if (!rules.allowed_for.includes(sellerType)) {
        return {
            allowed: false,
            reason: 'restricted_category',
            message: `Catégorie '${category}' réservée aux professionnels`,
            requiresPro: true,
        };
    }

    if (rules.restrictions.length > 0) {
        return {
            allowed: true,
            restrictions: rules.restrictions,
            message: `Attention : ${rules.restrictions.join('; ')}`,
        };
    }

    return { allowed: true };
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { title, description, category } = await req.json();

        if (!title || !category) {
            return Response.json({
                valid: false,
                message: 'Titre et catégorie requis'
            }, { status: 400 });
        }

        const fullText = `${title} ${description || ''}`;
        const sellerType = user.seller_type || 'particulier';

        // Check forbidden keywords
        const scan = scanForbiddenKeywords(fullText);

        if (scan.forbidden) {
            // Exception: alcohol allowed if category=alcool and seller=commercant
            if (scan.matches.includes('alcohol') && category === 'alcool' && sellerType === 'commercant') {
                // Allow
            } else {
                return Response.json({
                    valid: false,
                    reason: 'forbidden_product',
                    matches: scan.matches,
                    message: `Produit interdit détecté : ${scan.matches.join(', ')}`,
                    suggestion: 'Les plats cuisinés maison, viandes crues et produits périmés sont interdits.',
                });
            }
        }

        // Check category restrictions
        const categoryCheck = validateCategory(category, sellerType);

        if (!categoryCheck.allowed) {
            return Response.json({
                valid: false,
                reason: categoryCheck.reason,
                message: categoryCheck.message,
                requiresPro: categoryCheck.requiresPro,
            });
        }

        // Build warnings
        const warnings: string[] = [];
        if (categoryCheck.restrictions) {
            warnings.push(...categoryCheck.restrictions.map(r => `⚠️ ${r}`));
        }

        return Response.json({
            valid: true,
            warnings,
            message: warnings.length > 0 ? 'Validé avec avertissements' : 'Panier validé',
        });

    } catch (error) {
        console.error('Erreur validation produit:', error);
        return Response.json({
            valid: false,
            message: error.message
        }, { status: 500 });
    }
});
