#!/usr/bin/env python3
"""
Product Validator for Legal Compliance
Scans basket contents for forbidden/restricted products
"""

import re
from typing import Dict, List, Optional, Tuple


class ProductValidator:
    """Validates basket products against platform rules and legal requirements"""
    
    # Forbidden keywords by category
    FORBIDDEN_KEYWORDS = {
        'homemade_meals': [
            r'\bfait maison\b',
            r'\bcuisiné par moi\b',
            r'\brecette de\b',
            r'\bplat préparé\b',
            r'\bcuisine maison\b',
            r'\bmon plat\b',
            r"j'ai cuisiné",
        ],
        'raw_meat': [
            r'\bviande crue\b',
            r'\bpoulet cru\b',
            r'\bsteak\b',
            r'\bviande hachée\b',
            r'\bcôtelette\b',
            r'\bbavette\b',
            r'\bentrecôte\b',
            r'\brôti cru\b',
        ],
        'raw_fish': [
            r'\bpoisson cru\b',
            r'\bsushi\b',
            r'\bsashimi\b',
            r'\bhuîtres\b',
            r'\bcoquillages\b',
            r'\bfruits de mer crus\b',
        ],
        'infant_food': [
            r'\blait infantile\b',
            r'\bpurée bébé\b',
            r'\bnourriture bébé\b',
            r'\baliment pour nourrisson\b',
        ],
        'expired': [
            r'\bpérimé\b',
            r'\bDLC dépassée\b',
            r'\bdate dépassée\b',
            r'\bexpiré\b',
            r'\bhors date\b',
        ],
        'alcohol': [
            r'\bvin\b',
            r'\bbière\b',
            r'\balcool\b',
            r'\bspiritueux\b',
            r'\bvodka\b',
            r'\bwhisky\b',
            r'\brhum\b',
            r'\bchampagne\b',
        ],
    }
    
    # Warning keywords (allergens)
    WARNING_KEYWORDS = {
        'allergens': [
            r'\barachide\b',
            r'\bcacahuète\b',
            r'\bgluten\b',
            r'\blactose\b',
            r'\bœuf\b',
            r'\bsoja\b',
            r'\bnoix\b',
            r'\bsésame\b',
        ],
    }
    
    # Category restrictions
    CATEGORY_RULES = {
        'fruits-legumes': {
            'allowed_for': ['particulier', 'professionnel'],
            'restrictions': [],
        },
        'pain-patisserie': {
            'allowed_for': ['professionnel'],
            'restrictions': ['Doit être emballé', 'Date de fabrication requise'],
        },
        'viande-poisson': {
            'allowed_for': ['professionnel'],
            'restrictions': ['Uniquement produits emballés', 'Traçabilité requise'],
        },
        'produits-laitiers': {
            'allowed_for': ['particulier', 'professionnel'],
            'restrictions': ['Lait cru interdit pour particuliers'],
        },
        'epicerie': {
            'allowed_for': ['particulier', 'professionnel'],
            'restrictions': [],
        },
        'alcool': {
            'allowed_for': ['professionnel'],
            'restrictions': ['Licence requise', 'Preuve de licence IV/III'],
        },
    }
    
    def __init__(self):
        """Initialize product validator"""
        pass
    
    def is_product_allowed(
        self,
        product_name: str,
        category: str,
        seller_status: str = 'particulier',
    ) -> Dict:
        """
        Check if product is allowed for given seller status
        
        Args:
            product_name: Product name/description
            category: Product category
            seller_status: 'particulier' or 'professionnel'
        
        Returns:
            Dict with allowed status and details
        
        Example:
            >>> validator = ProductValidator()
            >>> result = validator.is_product_allowed("Poulet rôti fait maison", "viande-poisson")
            >>> print(result['allowed'])
            False
        """
        # Check category restrictions FIRST (for alcohol exception)
        category_check = self.validate_category(category, seller_status)
        if not category_check['allowed']:
            return category_check
        
        # Scan for forbidden keywords (skip alcohol check if category=alcool + pro)
        scan = self.scan_forbidden_keywords(product_name)
        if scan['forbidden']:
            # Exception: alcohol allowed if category=alcool and seller=pro
            if 'alcohol' in scan['matches'] and category == 'alcool' and seller_status == 'professionnel':
                pass  # Allow
            else:
                return {
                    'allowed': False,
                    'reason': 'forbidden_product',
                    'matches': scan['matches'],
                    'message': f"Produit interdit : {', '.join(scan['matches'])}",
                }
        
        # Check warnings
        if scan['warnings']:
            return {
                'allowed': True,
                'warnings': scan['warnings'],
                'message': 'Pensez à mentionner les allergènes dans la description',
            }
        
        return {
            'allowed': True,
            'message': 'Produit validé',
        }
    
    def scan_forbidden_keywords(self, text: str) -> Dict:
        """
        Scan text for forbidden keywords using regex
        
        Args:
            text: Text to scan (title + description)
        
        Returns:
            Dict with forbidden status, matches, and warnings
        
        Example:
            >>> scan = validator.scan_forbidden_keywords("Poulet cru et légumes")
            >>> print(scan['forbidden'])
            True
        """
        text_lower = text.lower()
        forbidden_matches = []
        warning_matches = []
        
        # Check forbidden keywords
        for category, patterns in self.FORBIDDEN_KEYWORDS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    forbidden_matches.append(category.replace('_', ' '))
        
        # Check warning keywords
        for category, patterns in self.WARNING_KEYWORDS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    warning_matches.append(category)
        
        return {
            'forbidden': len(forbidden_matches) > 0,
            'matches': list(set(forbidden_matches)),
            'warnings': list(set(warning_matches)),
        }
    
    def validate_category(
        self,
        category: str,
        seller_status: str,
    ) -> Dict:
        """
        Validate if seller can list in this category
        
        Args:
            category: Product category
            seller_status: 'particulier' or 'professionnel'
        
        Returns:
            Dict with validation result
        
        Example:
            >>> result = validator.validate_category("alcool", "particulier")
            >>> print(result['allowed'])
            False
        """
        if category not in self.CATEGORY_RULES:
            return {
                'allowed': True,
                'message': 'Category not restricted',
            }
        
        rules = self.CATEGORY_RULES[category]
        
        # Check if seller status is allowed
        if seller_status not in rules['allowed_for']:
            return {
                'allowed': False,
                'reason': 'restricted_category',
                'message': f"Catégorie '{category}' réservée aux professionnels",
                'requires_pro': True,
            }
        
        # Return restrictions as warnings
        if rules['restrictions']:
            return {
                'allowed': True,
                'restrictions': rules['restrictions'],
                'message': f"Attention : {'; '.join(rules['restrictions'])}",
            }
        
        return {
            'allowed': True,
            'message': 'Category allowed',
        }
    
    def validate_basket(self, basket_data: Dict) -> Dict:
        """
        Validate complete basket before creation
        
        Args:
            basket_data: Dict with title, description, category, seller_status
        
        Returns:
            Dict with validation result
        
        Example:
            >>> basket = {
            ...     'title': 'Lot de fruits',
            ...     'description': 'Pommes et poires',
            ...     'category': 'fruits-legumes',
            ...     'seller_status': 'particulier'
            ... }
            >>> result = validator.validate_basket(basket)
            >>> print(result['valid'])
            True
        """
        full_text = f"{basket_data.get('title', '')} {basket_data.get('description', '')}"
        
        # Scan keywords
        scan = self.scan_forbidden_keywords(full_text)
        
        if scan['forbidden']:
            return {
                'valid': False,
                'reason': 'forbidden_product',
                'matches': scan['matches'],
                'message': f"Produit interdit détecté : {', '.join(scan['matches'])}",
                'suggestion': "Les plats cuisinés maison, viandes crues et produits périmés sont interdits.",
            }
        
        # Check category
        category_check = self.validate_category(
            basket_data.get('category', ''),
            basket_data.get('seller_status', 'particulier'),
        )
        
        if not category_check['allowed']:
            return {
                'valid': False,
                'reason': 'restricted_category',
                'message': category_check['message'],
                'requires_pro': category_check.get('requires_pro', False),
            }
        
        # Warnings
        warnings = []
        if scan['warnings']:
            warnings.append("⚠️ Allergènes détectés : mentionnez-les clairement")
        
        if category_check.get('restrictions'):
            warnings.extend([f"⚠️ {r}" for r in category_check['restrictions']])
        
        return {
            'valid': True,
            'warnings': warnings,
            'message': 'Panier validé' if not warnings else 'Validé avec avertissements',
        }
    
    def get_suggestions(self, rejected_text: str) -> List[str]:
        """
        Get suggestions for rejected products
        
        Args:
            rejected_text: The rejected product description
        
        Returns:
            List of suggestions
        """
        suggestions = []
        
        if 'fait maison' in rejected_text.lower():
            suggestions.append("✅ Proposez plutôt des ingrédients bruts (fruits, légumes, produits emballés)")
        
        if any(word in rejected_text.lower() for word in ['viande', 'poulet', 'poisson']):
            suggestions.append("✅ Seuls les professionnels peuvent vendre viande/poisson (emballé uniquement)")
        
        if 'alcool' in rejected_text.lower() or 'vin' in rejected_text.lower():
            suggestions.append("✅ Passez vendeur professionnel avec licence pour vendre de l'alcool")
        
        if not suggestions:
            suggestions.append("✅ Consultez notre liste de produits autorisés dans l'aide")
        
        return suggestions


# CLI Interface
if __name__ == '__main__':
    import argparse
    import json
    
    parser = argparse.ArgumentParser(description='Product Validator')
    parser.add_argument('--test', action='store_true', help='Run test suite')
    parser.add_argument('--scan', metavar='TEXT', help='Scan text for forbidden keywords')
    parser.add_argument('--validate', metavar='JSON', help='Validate basket (JSON string)')
    
    args = parser.parse_args()
    
    validator = ProductValidator()
    
    if args.test:
        print("🧪 Running test suite...\n")
        
        tests = [
            ("Lot de pommes bio", "fruits-legumes", "particulier", True),
            ("Poulet rôti fait maison", "viande-poisson", "particulier", False),
            ("Pain de campagne", "pain-patisserie", "professionnel", True),
            ("Pain de campagne", "pain-patisserie", "particulier", False),
            ("Vin rouge bio", "alcool", "particulier", False),
            ("Vin rouge bio", "alcool", "professionnel", True),
            ("Produit périmé", "epicerie", "particulier", False),
        ]
        
        for text, category, status, expected in tests:
            result = validator.is_product_allowed(text, category, status)
            passed = result['allowed'] == expected
            icon = "✅" if passed else "❌"
            print(f"{icon} {text} ({status}): {result['allowed']}")
            if not result['allowed']:
                print(f"   → {result.get('message', '')}")
        
    elif args.scan:
        result = validator.scan_forbidden_keywords(args.scan)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if result['forbidden']:
            print(f"\n❌ REJECTED: {result['matches']}")
            suggestions = validator.get_suggestions(args.scan)
            for s in suggestions:
                print(s)
        else:
            print("\n✅ ALLOWED")
    
    elif args.validate:
        basket = json.loads(args.validate)
        result = validator.validate_basket(basket)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        
        if not result['valid']:
            suggestions = validator.get_suggestions(basket.get('title', '') + basket.get('description', ''))
            print("\n💡 Suggestions:")
            for s in suggestions:
                print(s)
    
    else:
        parser.print_help()
