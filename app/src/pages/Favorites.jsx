import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import BasketCard from "@/components/baskets/BasketCard";
import EmptyState from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";

export default function Favorites() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites = [], isLoading: loadingFavorites } = useQuery({
    queryKey: ['favorites', currentUser?.id],
    queryFn: () => base44.entities.Favorite.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const { data: baskets = [], isLoading: loadingBaskets } = useQuery({
    queryKey: ['favoriteBaskets', favorites],
    queryFn: async () => {
      const basketIds = favorites.filter(f => f.basket_id).map(f => f.basket_id);
      if (basketIds.length === 0) return [];
      
      const allBaskets = await base44.entities.Basket.list('-created_date');
      return allBaskets.filter(b => basketIds.includes(b.id));
    },
    enabled: favorites.length > 0,
  });

  const isLoading = loadingFavorites || loadingBaskets;

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="w-8 h-8 text-rose-500 fill-rose-500" />
            Mes favoris
          </h1>
          <p className="text-gray-500 mt-1">
            {baskets.length} panier{baskets.length !== 1 ? 's' : ''} sauvegardé{baskets.length !== 1 ? 's' : ''}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : baskets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {baskets.map(basket => (
              <BasketCard key={basket.id} basket={basket} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title="Aucun favori"
            description="Vous n'avez pas encore sauvegardé de panier. Cliquez sur le cœur d'un panier pour l'ajouter à vos favoris."
          />
        )}
      </div>
    </div>
  );
}