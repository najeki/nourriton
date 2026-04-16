import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Leaf, ShoppingBag, Heart } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import VendorStatusBadge from "@/components/vendors/VendorStatusBadge";

const categoryLabels = {
  fruits_legumes: "Fruits & Légumes",
  boulangerie: "Boulangerie",
  epicerie: "Épicerie",
  produits_frais: "Produits frais",
  plats_prepares: "Plats préparés",
  mixte: "Mixte"
};

const categoryColors = {
  fruits_legumes: "bg-green-100 text-green-700",
  boulangerie: "bg-amber-100 text-amber-700",
  epicerie: "bg-blue-100 text-blue-700",
  produits_frais: "bg-cyan-100 text-cyan-700",
  plats_prepares: "bg-orange-100 text-orange-700",
  mixte: "bg-purple-100 text-purple-700"
};

export default function BasketCard({ basket, distance }) {
  const queryClient = useQueryClient();
  const [isHovered, setIsHovered] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', currentUser?.id],
    queryFn: () => base44.entities.Favorite.filter({ user_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  const isFavorite = favorites.some(f => f.basket_id === basket.id);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        const fav = favorites.find(f => f.basket_id === basket.id);
        await base44.entities.Favorite.delete(fav.id);
      } else {
        await base44.entities.Favorite.create({
          user_id: currentUser.id,
          basket_id: basket.id,
          seller_id: basket.seller_id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['favorites']);
      toast.success(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
    }
  });

  const discount = basket.original_price
    ? Math.round((1 - basket.price / basket.original_price) * 100)
    : null;

  const isSold = basket.status === 'sold';
  const isReserved = basket.status === 'reserved';

  return (
    <Card
      className="group overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={createPageUrl("BasketDetail") + `?id=${basket.id}`}>
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50">
            {basket.photo_url ? (
              <img
                src={basket.photo_url}
                alt={basket.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-emerald-200" />
              </div>
            )}
          </div>

          {isSold && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-gray-500 text-white px-2.5 py-1 text-xs shadow-lg">
                Vendu
              </Badge>
            </div>
          )}

          {Number(basket.price) === 0 && !isSold && !isReserved && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-emerald-500 text-white px-2.5 py-1 text-xs font-bold shadow-lg">
                Gratuit
              </Badge>
            </div>
          )}

          {discount && !isReserved && !isSold && Number(basket.price) > 0 && (
            <div className="absolute top-3 left-3">
              <Badge className="bg-rose-500 text-white font-bold px-2.5 py-1 text-xs shadow-lg">
                -{discount}%
              </Badge>
            </div>
          )}

          {basket.category && (
            <div className="absolute top-3 right-3">
              <Badge className={`${categoryColors[basket.category]} font-medium text-xs`}>
                {categoryLabels[basket.category]}
              </Badge>
            </div>
          )}

          {currentUser && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavoriteMutation.mutate();
              }}
              className={`absolute bottom-3 right-3 p-2.5 rounded-full shadow-lg transition-all ${isFavorite
                ? 'bg-rose-500 text-white'
                : 'bg-white/95 text-gray-400 hover:text-rose-500'
                } ${isHovered ? 'scale-110' : ''}`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}

          <div className="absolute bottom-3 left-3 right-16">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                  {distance ? `${distance.toFixed(1)} km` : basket.pickup_address?.split(',')[0]}
                </div>
                <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  {basket.pickup_time_start} - {basket.pickup_time_end}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-gray-800 line-clamp-1 group-hover:text-emerald-600 transition-colors">
              {basket.title}
            </h3>
          </div>

          <p className="text-gray-500 text-sm line-clamp-2 mb-3 min-h-[2.5rem]">
            {basket.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-emerald-600">{basket.price?.toFixed(2)}€</span>
              {basket.original_price && (
                <span className="text-sm text-gray-400 line-through">{basket.original_price?.toFixed(2)}€</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              Anti-gaspi
            </div>
          </div>
        </div>
      </Link>

      <div className="px-4 pb-4">
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {basket.pickup_date && format(new Date(basket.pickup_date), "EEEE d MMMM", { locale: fr })}
            </div>
          </div>
          <Link 
            to={`${createPageUrl("SellerProfile")}?id=${basket.seller_id}`}
            className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-lg transition-colors group/seller w-fit"
          >
            <span className="text-sm font-medium text-gray-600 group-hover/seller:text-emerald-600 transition-colors">
              {basket.seller_type === 'commercant' ? '🏪' : '👤'} {basket.seller_name}
            </span>
            <VendorStatusBadge
              sellerType={basket.seller_type}
              onboardingCompleted={basket.seller_onboarding_completed}
              salesCount={basket.seller_sales_count}
              size="sm"
            />
            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover/seller:text-emerald-500 group-hover/seller:translate-x-0.5 transition-all opacity-0 group-hover/seller:opacity-100" />
          </Link>
        </div>
      </div>
    </Card>
  );
}