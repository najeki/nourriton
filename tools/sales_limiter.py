#!/usr/bin/env python3
"""
Sales Limiter for Particuliers
Tracks and enforces monthly sales limits for individual vendors
"""

import os
import sys
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from calendar import monthrange


class SalesLimiter:
    """Manages monthly sales tracking and limit enforcement for particuliers"""
    
    def __init__(self, db_connection=None):
        """
        Initialize sales limiter
        
        Args:
            db_connection: Database connection (mock if None)
        """
        self.db = db_connection
        self.DEFAULT_LIMIT = 10
        self.DEFAULT_WARNING = 8
    
    def get_monthly_sales_count(
        self, 
        vendor_id: str, 
        month: Optional[str] = None
    ) -> Dict:
        """
        Get vendor's sales count for specified month
        
        Args:
            vendor_id: Vendor's unique ID
            month: Month in format "YYYY-MM" (defaults to current month)
        
        Returns:
            Dict with count, limit, and status
        
        Example:
            >>> limiter = SalesLimiter()
            >>> result = limiter.get_monthly_sales_count('vendor_123')
            >>> print(result['current_count'])
            5
        """
        if not month:
            month = datetime.now().strftime('%Y-%m')
        
        # In production, query database
        # For now, simulate with mock data
        vendor_data = self._get_vendor_data(vendor_id)
        
        # Check if need to reset (new month)
        if self._is_new_month(vendor_data.get('last_sales_reset')):
            self._reset_counter(vendor_id)
            vendor_data = self._get_vendor_data(vendor_id)
        
        return {
            'vendor_id': vendor_id,
            'month': month,
            'current_count': vendor_data.get('monthly_sales_count', 0),
            'limit': vendor_data.get('sales_limit', self.DEFAULT_LIMIT),
            'warning_threshold': vendor_data.get('sales_warning_threshold', self.DEFAULT_WARNING),
            'status': self._get_status(vendor_data),
        }
    
    def increment_sales_counter(
        self,
        vendor_id: str,
        basket_id: str,
        amount: float = 0.0,
    ) -> Dict:
        """
        Increment vendor's sales counter after successful payment
        
        Args:
            vendor_id: Vendor's unique ID
            basket_id: Reference to sold basket
            amount: Sale amount (for logging)
        
        Returns:
            Dict with updated count and status
        
        Example:
            >>> result = limiter.increment_sales_counter('vendor_123', 'basket_abc')
            >>> if result['limit_reached']:
            ...     print("Vendor suspended!")
        """
        vendor_data = self._get_vendor_data(vendor_id)
        
        # Check if new month (auto-reset)
        if self._is_new_month(vendor_data.get('last_sales_reset')):
            self._reset_counter(vendor_id)
            vendor_data = self._get_vendor_data(vendor_id)
        
        # Only for particuliers
        if vendor_data.get('vendor_status') != 'particulier':
            return {
                'success': True,
                'message': 'Professional vendor - no limit',
                'current_count': None,
            }
        
        # Increment
        new_count = vendor_data.get('monthly_sales_count', 0) + 1
        self._update_vendor(vendor_id, {
            'monthly_sales_count': new_count,
        })
        
        # Log to history
        self._log_sale(vendor_id, basket_id, amount, counted=True)
        
        # Check thresholds
        limit = vendor_data.get('sales_limit', self.DEFAULT_LIMIT)
        warning = vendor_data.get('sales_warning_threshold', self.DEFAULT_WARNING)
        
        status = {
            'success': True,
            'current_count': new_count,
            'limit': limit,
            'limit_reached': new_count >= limit,
            'warning_reached': new_count >= warning,
        }
        
        # Suspend if limit reached
        if status['limit_reached']:
            self._suspend_vendor(vendor_id, 'monthly_limit_reached')
            status['message'] = f"Limite atteinte ({limit} ventes/mois). Passez Pro pour continuer."
        
        elif status['warning_reached']:
            status['message'] = f"Attention : {new_count}/{limit} ventes ce mois-ci"
        
        return status
    
    def decrement_sales_counter(
        self,
        vendor_id: str,
        basket_id: str,
    ) -> Dict:
        """
        Decrement counter after refund (only if same month)
        
        Args:
            vendor_id: Vendor's unique ID
            basket_id: Reference to refunded basket
        
        Returns:
            Dict with updated count
        
        Example:
            >>> result = limiter.decrement_sales_counter('vendor_123', 'basket_abc')
            >>> if result['suspension_lifted']:
            ...     print("Vendor can sell again!")
        """
        vendor_data = self._get_vendor_data(vendor_id)
        sale_history = self._get_sale_history(basket_id)
        
        current_month = datetime.now().strftime('%Y-%m')
        
        # Only decrement if sale was in current month
        if not sale_history or sale_history.get('month_year') != current_month:
            return {
                'success': False,
                'message': 'Refund from previous month - counter unchanged',
                'current_count': vendor_data.get('monthly_sales_count', 0),
            }
        
        # Decrement
        new_count = max(0, vendor_data.get('monthly_sales_count', 0) - 1)
        self._update_vendor(vendor_id, {
            'monthly_sales_count': new_count,
        })
        
        # Update history
        self._update_sale_history(basket_id, counted=False)
        
        # Lift suspension if was blocked
        suspension_lifted = False
        if (vendor_data.get('account_suspended') and 
            vendor_data.get('suspension_reason') == 'monthly_limit_reached'):
            self._unsuspend_vendor(vendor_id)
            suspension_lifted = True
        
        return {
            'success': True,
            'current_count': new_count,
            'suspension_lifted': suspension_lifted,
            'message': 'Compte réactivé' if suspension_lifted else 'Compteur décrémenté',
        }
    
    def check_limit_reached(
        self,
        vendor_id: str,
        limit: Optional[int] = None,
    ) -> Dict:
        """
        Check if vendor has reached monthly sales limit
        
        Args:
            vendor_id: Vendor's unique ID
            limit: Custom limit (uses default if None)
        
        Returns:
            Dict with can_sell, reason, and counts
        
        Example:
            >>> check = limiter.check_limit_reached('vendor_123')
            >>> if not check['can_sell']:
            ...     show_upgrade_modal()
        """
        vendor_data = self._get_vendor_data(vendor_id)
        
        # Auto-reset if new month
        if self._is_new_month(vendor_data.get('last_sales_reset')):
            self._reset_counter(vendor_id)
            vendor_data = self._get_vendor_data(vendor_id)
        
        # Pros have no limit
        if vendor_data.get('vendor_status') == 'professionnel':
            return {
                'can_sell': True,
                'reason': 'professional_vendor',
                'current_count': None,
                'limit': None,
            }
        
        current_count = vendor_data.get('monthly_sales_count', 0)
        sales_limit = limit or vendor_data.get('sales_limit', self.DEFAULT_LIMIT)
        warning_threshold = vendor_data.get('sales_warning_threshold', self.DEFAULT_WARNING)
        
        result = {
            'can_sell': current_count < sales_limit,
            'current_count': current_count,
            'limit': sales_limit,
            'warning_threshold': warning_threshold,
        }
        
        if not result['can_sell']:
            result['reason'] = 'monthly_limit_reached'
            result['message'] = f"Limite atteinte ({sales_limit} ventes/mois)"
        elif current_count >= warning_threshold:
            result['warning'] = True
            result['message'] = f"Attention : {current_count}/{sales_limit} ventes"
        
        return result
    
    def send_warning_alert(
        self,
        vendor_id: str,
        current_count: int,
        limit: int,
    ) -> Dict:
        """
        Send warning notification to vendor approaching limit
        
        Args:
            vendor_id: Vendor's unique ID
            current_count: Current sales count
            limit: Monthly limit
        
        Returns:
            Dict with notification status
        """
        # In production, send email/push notification
        print(f"⚠️  Warning sent to {vendor_id}: {current_count}/{limit} ventes")
        
        return {
            'success': True,
            'vendor_id': vendor_id,
            'notification_type': 'warning',
            'message': f"{current_count}/{limit} ventes ce mois-ci",
        }
    
    def suspend_vendor_account(
        self,
        vendor_id: str,
        reason: str = 'monthly_limit_reached',
    ) -> Dict:
        """
        Suspend vendor account for exceeding limit
        
        Args:
            vendor_id: Vendor's unique ID
            reason: Suspension reason
        
        Returns:
            Dict with suspension status
        """
        self._update_vendor(vendor_id, {
            'account_suspended': True,
            'suspension_reason': reason,
            'suspended_at': datetime.now().isoformat(),
        })
        
        print(f"🚫 Vendor {vendor_id} suspended: {reason}")
        
        return {
            'success': True,
            'vendor_id': vendor_id,
            'suspended': True,
            'reason': reason,
        }
    
    def reset_monthly_sales(self, vendor_id: str) -> Dict:
        """
        Manually reset vendor's monthly counter
        
        Args:
            vendor_id: Vendor's unique ID
        
        Returns:
            Dict with reset status
        """
        self._update_vendor(vendor_id, {
            'monthly_sales_count': 0,
            'last_sales_reset': datetime.now().isoformat(),
            'account_suspended': False,
            'suspension_reason': None,
        })
        
        return {
            'success': True,
            'vendor_id': vendor_id,
            'message': 'Counter reset to 0',
        }
    
    # Internal helper methods
    
    def _get_vendor_data(self, vendor_id: str) -> Dict:
        """Mock vendor data retrieval (replace with DB query)"""
        # In production: return self.db.query('SELECT * FROM users WHERE id = ?', vendor_id)
        return {
            'id': vendor_id,
            'vendor_status': 'particulier',
            'monthly_sales_count': 0,
            'sales_limit': self.DEFAULT_LIMIT,
            'sales_warning_threshold': self.DEFAULT_WARNING,
            'last_sales_reset': datetime.now().isoformat(),
            'account_suspended': False,
            'suspension_reason': None,
        }
    
    def _update_vendor(self, vendor_id: str, data: Dict):
        """Mock vendor update (replace with DB query)"""
        # In production: self.db.update('users', data, where={'id': vendor_id})
        print(f"📝 Updated vendor {vendor_id}: {data}")
    
    def _log_sale(self, vendor_id: str, basket_id: str, amount: float, counted: bool):
        """Log sale to history table"""
        # In production: self.db.insert('sales_history', {...})
        print(f"📊 Logged sale: {vendor_id} - {basket_id} - €{amount} - counted={counted}")
    
    def _get_sale_history(self, basket_id: str) -> Optional[Dict]:
        """Get sale history entry"""
        # In production: return self.db.query('SELECT * FROM sales_history WHERE basket_id = ?', basket_id)
        return {
            'basket_id': basket_id,
            'month_year': datetime.now().strftime('%Y-%m'),
            'counted_toward_limit': True,
        }
    
    def _update_sale_history(self, basket_id: str, counted: bool):
        """Update sale history"""
        # In production: self.db.update('sales_history', {'counted_toward_limit': counted}, ...)
        print(f"📝 Updated sale history {basket_id}: counted={counted}")
    
    def _is_new_month(self, last_reset: Optional[str]) -> bool:
        """Check if we've entered a new month since last reset"""
        if not last_reset:
            return True
        
        last_reset_date = datetime.fromisoformat(last_reset.replace('Z', '+00:00'))
        current_date = datetime.now()
        
        return (current_date.month != last_reset_date.month or 
                current_date.year != last_reset_date.year)
    
    def _reset_counter(self, vendor_id: str):
        """Reset counter for new month"""
        self.reset_monthly_sales(vendor_id)
    
    def _get_status(self, vendor_data: Dict) -> str:
        """Get vendor status string"""
        if vendor_data.get('account_suspended'):
            return 'suspended'
        
        count = vendor_data.get('monthly_sales_count', 0)
        limit = vendor_data.get('sales_limit', self.DEFAULT_LIMIT)
        warning = vendor_data.get('sales_warning_threshold', self.DEFAULT_WARNING)
        
        if count >= limit:
            return 'limit_reached'
        elif count >= warning:
            return 'warning'
        else:
            return 'active'
    
    def _suspend_vendor(self, vendor_id: str, reason: str):
        """Suspend vendor"""
        self.suspend_vendor_account(vendor_id, reason)
    
    def _unsuspend_vendor(self, vendor_id: str):
        """Remove suspension"""
        self._update_vendor(vendor_id, {
            'account_suspended': False,
            'suspension_reason': None,
        })


# CLI Interface
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Sales Limiter for Particuliers')
    parser.add_argument('--vendor-id', required=True, help='Vendor ID')
    parser.add_argument('--check-limit', action='store_true', help='Check if limit reached')
    parser.add_argument('--increment', metavar='BASKET_ID', help='Increment counter')
    parser.add_argument('--decrement', metavar='BASKET_ID', help='Decrement counter (refund)')
    parser.add_argument('--reset', action='store_true', help='Reset monthly counter')
    parser.add_argument('--get-count', action='store_true', help='Get current count')
    
    args = parser.parse_args()
    
    limiter = SalesLimiter()
    vendor_id = args.vendor_id
    
    if args.check_limit:
        result = limiter.check_limit_reached(vendor_id)
        print(f"✅ Can sell: {result['can_sell']}")
        print(f"📊 Count: {result['current_count']}/{result['limit']}")
        if not result['can_sell']:
            print(f"❌ Reason: {result['reason']}")
    
    elif args.increment:
        result = limiter.increment_sales_counter(vendor_id, args.increment)
        print(f"✅ New count: {result['current_count']}/{result['limit']}")
        if result.get('limit_reached'):
            print(f"🚫 LIMIT REACHED: {result['message']}")
        elif result.get('warning_reached'):
            print(f"⚠️  {result['message']}")
    
    elif args.decrement:
        result = limiter.decrement_sales_counter(vendor_id, args.decrement)
        if result['success']:
            print(f"✅ New count: {result['current_count']}")
            if result.get('suspension_lifted'):
                print(f"🎉 {result['message']}")
        else:
            print(f"❌ {result['message']}")
    
    elif args.reset:
        result = limiter.reset_monthly_sales(vendor_id)
        print(f"✅ {result['message']}")
    
    elif args.get_count:
        result = limiter.get_monthly_sales_count(vendor_id)
        print(f"📊 Current: {result['current_count']}/{result['limit']}")
        print(f"📍 Status: {result['status']}")
    
    else:
        parser.print_help()
