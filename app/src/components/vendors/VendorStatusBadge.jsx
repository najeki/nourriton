import React from 'react';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User } from "lucide-react";

export default function VendorStatusBadge({ status, className }) {
    if (status === 'commercant') {
        return (
            <Badge variant="outline" className={`bg-blue-50 text-blue-700 border-blue-200 gap-1 ${className}`}>
                <CheckCircle2 className="w-3 h-3" />
                Pro
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className={`bg-gray-50 text-gray-600 border-gray-200 gap-1 ${className}`}>
            <User className="w-3 h-3" />
            Particulier
        </Badge>
    );
}
