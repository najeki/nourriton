import { base44 } from '@base44/sdk';

interface UpdateSalesCountRequest {
    userId: string;
}

interface UpdateSalesCountResponse {
    success: boolean;
    sales_count: number;
    message?: string;
}

/**
 * Increment the sales_count for a user after a successful sale
 * This should be called from Stripe webhooks when a payment succeeds
 */
export default async function updateSalesCount(
    req: UpdateSalesCountRequest
): Promise<UpdateSalesCountResponse> {
    try {
        const { userId } = req;

        if (!userId) {
            return {
                success: false,
                sales_count: 0,
                message: 'User ID is required',
            };
        }

        // Get current user data
        const user = await base44.entities.User.get(userId);

        if (!user) {
            return {
                success: false,
                sales_count: 0,
                message: 'User not found',
            };
        }

        // Only increment for particulier sellers (pros don't have limits)
        if (user.seller_type !== 'particulier') {
            return {
                success: true,
                sales_count: user.sales_count || 0,
                message: 'Professional sellers do not have sales limits',
            };
        }

        // Increment the sales count
        const newCount = (user.sales_count || 0) + 1;

        await base44.entities.User.update(userId, {
            sales_count: newCount,
        });

        return {
            success: true,
            sales_count: newCount,
            message: `Sales count updated to ${newCount}`,
        };
    } catch (error: any) {
        console.error('Error updating sales count:', error);
        return {
            success: false,
            sales_count: 0,
            message: error.message || 'Failed to update sales count',
        };
    }
}
