#!/usr/bin/env python3
"""
Stripe Connect Express Account Manager
Handles creation, onboarding, and status management for vendor accounts
"""

import os
import sys
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta

# Stripe will be imported via MCP or installed package
try:
    import stripe
except ImportError:
    print("⚠️  Stripe package not found. Install with: pip install stripe")
    sys.exit(1)


class StripeConnectManager:
    """Manages Stripe Connect Express accounts for Nourriton vendors"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Stripe with API key
        
        Args:
            api_key: Stripe secret key (reads from env if not provided)
        """
        self.api_key = api_key or os.getenv('STRIPE_SECRET_KEY')
        if not self.api_key:
            raise ValueError("Stripe API key required (STRIPE_SECRET_KEY env var)")
        
        stripe.api_key = self.api_key
    
    def create_express_account(
        self, 
        email: str, 
        country: str = 'FR',
        business_type: str = 'individual'
    ) -> Dict:
        """
        Create a new Stripe Express account for a vendor
        
        Args:
            email: Vendor's email address
            country: ISO country code (default: FR for France)
            business_type: 'individual' for particuliers, 'company' for pros
        
        Returns:
            Dict with account_id, status, and metadata
        
        Example:
            >>> manager = StripeConnectManager()
            >>> result = manager.create_express_account('vendor@example.com')
            >>> print(result['account_id'])
            acct_1234567890
        """
        try:
            account = stripe.Account.create(
                type='express',
                country=country,
                email=email,
                business_type=business_type,
                capabilities={
                    'transfers': {'requested': True},
                },
                individual={
                    'email': email,
                } if business_type == 'individual' else None,
            )
            
            return {
                'success': True,
                'account_id': account.id,
                'email': account.email,
                'business_type': account.business_type,
                'status': 'pending',
                'charges_enabled': account.charges_enabled,
                'payouts_enabled': account.payouts_enabled,
                'created_at': datetime.fromtimestamp(account.created),
            }
        
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
            }
    
    def create_onboarding_link(
        self,
        account_id: str,
        return_url: str = 'https://nourriton.app/vendor/success',
        refresh_url: str = 'https://nourriton.app/vendor/reauth',
    ) -> Dict:
        """
        Generate onboarding link for vendor KYC
        
        Args:
            account_id: Stripe account ID
            return_url: URL to redirect after successful onboarding
            refresh_url: URL to redirect if link expires
        
        Returns:
            Dict with onboarding URL and expiration
        
        Example:
            >>> link = manager.create_onboarding_link('acct_123')
            >>> print(link['url'])
            https://connect.stripe.com/setup/e/acct_123/...
        """
        try:
            account_link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=refresh_url,
                return_url=return_url,
                type='account_onboarding',
            )
            
            return {
                'success': True,
                'url': account_link.url,
                'expires_at': datetime.fromtimestamp(account_link.expires_at),
                'valid_for_hours': 24,
            }
        
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
            }
    
    def check_account_status(self, account_id: str) -> Dict:
        """
        Check verification status of Express account
        
        Args:
            account_id: Stripe account ID
        
        Returns:
            Dict with detailed account status
        
        Example:
            >>> status = manager.check_account_status('acct_123')
            >>> if status['verified']:
            ...     print("Vendor can receive payments")
        """
        try:
            account = stripe.Account.retrieve(account_id)
            
            # Determine overall status
            verified = account.charges_enabled and account.payouts_enabled
            
            # Check for requirements
            requirements = account.requirements
            currently_due = requirements.get('currently_due', [])
            eventually_due = requirements.get('eventually_due', [])
            
            return {
                'success': True,
                'account_id': account.id,
                'email': account.email,
                'verified': verified,
                'charges_enabled': account.charges_enabled,
                'payouts_enabled': account.payouts_enabled,
                'capabilities': account.capabilities,
                'requirements': {
                    'currently_due': currently_due,
                    'eventually_due': eventually_due,
                    'disabled_reason': requirements.get('disabled_reason'),
                },
                'details_submitted': account.details_submitted,
            }
        
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
            }
    
    def create_transfer(
        self,
        account_id: str,
        amount_eur: float,
        basket_id: str,
        vendor_id: str,
    ) -> Dict:
        """
        Transfer funds to vendor account
        
        Args:
            account_id: Stripe account ID
            amount_eur: Amount in euros (will be converted to cents)
            basket_id: Reference to basket transaction
            vendor_id: Internal vendor ID
        
        Returns:
            Dict with transfer details
        
        Example:
            >>> transfer = manager.create_transfer('acct_123', 15.50, 'basket_abc', 'vendor_xyz')
            >>> print(transfer['transfer_id'])
            tr_1234567890
        """
        try:
            # Convert EUR to cents
            amount_cents = int(amount_eur * 100)
            
            transfer = stripe.Transfer.create(
                amount=amount_cents,
                currency='eur',
                destination=account_id,
                transfer_group=f'basket_{basket_id}',
                metadata={
                    'basket_id': basket_id,
                    'vendor_id': vendor_id,
                    'amount_eur': amount_eur,
                },
            )
            
            return {
                'success': True,
                'transfer_id': transfer.id,
                'amount_eur': amount_eur,
                'amount_cents': amount_cents,
                'destination': transfer.destination,
                'created_at': datetime.fromtimestamp(transfer.created),
                'status': 'pending',  # Stripe will process
            }
        
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
            }


# CLI Interface for testing
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Stripe Connect Express Manager')
    parser.add_argument('--test', action='store_true', help='Run test mode')
    parser.add_argument('--create-account', metavar='EMAIL', help='Create Express account')
    parser.add_argument('--onboarding-link', metavar='ACCOUNT_ID', help='Generate onboarding link')
    parser.add_argument('--check-status', metavar='ACCOUNT_ID', help='Check account status')
    parser.add_argument('--country', default='FR', help='Country code (default: FR)')
    
    args = parser.parse_args()
    
    # Initialize manager
    manager = StripeConnectManager()
    
    if args.test:
        print("🧪 Testing Stripe Connect Express...")
        result = manager.create_express_account('test@nourriton.app', country=args.country)
        print(f"✅ Account created: {result}")
        
        if result['success']:
            link = manager.create_onboarding_link(result['account_id'])
            print(f"🔗 Onboarding link: {link['url']}")
    
    elif args.create_account:
        result = manager.create_express_account(args.create_account, country=args.country)
        if result['success']:
            print(f"✅ Account ID: {result['account_id']}")
        else:
            print(f"❌ Error: {result['error']}")
    
    elif args.onboarding_link:
        result = manager.create_onboarding_link(args.onboarding_link)
        if result['success']:
            print(f"🔗 Link: {result['url']}")
            print(f"⏰ Expires: {result['expires_at']}")
        else:
            print(f"❌ Error: {result['error']}")
    
    elif args.check_status:
        result = manager.check_account_status(args.check_status)
        if result['success']:
            print(f"📊 Status: {'✅ Verified' if result['verified'] else '⏳ Pending'}")
            print(f"Charges: {result['charges_enabled']}, Payouts: {result['payouts_enabled']}")
            if result['requirements']['currently_due']:
                print(f"⚠️  Missing: {result['requirements']['currently_due']}")
        else:
            print(f"❌ Error: {result['error']}")
    
    else:
        parser.print_help()
