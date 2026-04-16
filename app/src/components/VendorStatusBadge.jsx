import React from 'react';
import { COPY } from '../utils/copyText';

/**
 * VendorStatusBadge Component
 * Displays vendor status (Particulier / Professionnel) with optional sales counter
 * 
 * @param {Object} props
 * @param {'particulier' | 'professionnel'} props.status - Vendor status
 * @param {number} [props.salesCount] - Current sales count (for particuliers)
 * @param {number} [props.salesLimit=10] - Monthly sales limit (for particuliers)
 * @param {string} [props.className] - Additional CSS classes
 */
export const VendorStatusBadge = ({
    status = 'particulier',
    salesCount,
    salesLimit = 10,
    className = ''
}) => {
    const isParticulier = status === 'particulier';
    const isPro = status === 'professionnel';

    // Calculate warning level for particuliers
    const isApproachingLimit = isParticulier && salesCount >= salesLimit * 0.8; // 80% threshold
    const isAtLimit = isParticulier && salesCount >= salesLimit;

    const badgeStyle = {
        base: "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        particulier: isAtLimit
            ? "bg-red-100 text-red-800 border border-red-200"
            : isApproachingLimit
                ? "bg-orange-100 text-orange-800 border border-orange-200"
                : "bg-blue-100 text-blue-800 border border-blue-200",
        professionnel: "bg-purple-100 text-purple-800 border border-purple-200",
    };

    return (
        <div className={`${badgeStyle.base} ${isPro ? badgeStyle.professionnel : badgeStyle.particulier} ${className}`}>
            {/* Icon */}
            <span className="text-sm">
                {isPro ? '🏢' : '👤'}
            </span>

            {/* Status Label */}
            <span>
                {isPro ? COPY.badge.professionnel : COPY.badge.particulier}
            </span>

            {/* Sales Counter (only for particuliers) */}
            {isParticulier && typeof salesCount === 'number' && (
                <>
                    <span className="text-gray-400">•</span>
                    <span className={isApproachingLimit ? 'font-bold' : ''}>
                        {COPY.badge.salesCounter(salesCount, salesLimit)}
                    </span>
                </>
            )}
        </div>
    );
};

export default VendorStatusBadge;
