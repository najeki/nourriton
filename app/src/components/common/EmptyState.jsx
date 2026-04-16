import React from 'react';
import { Button } from "@/components/ui/button";

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  actionLabel,
  onAction 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-emerald-400" />
        </div>
      )}
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button 
          onClick={onAction}
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}