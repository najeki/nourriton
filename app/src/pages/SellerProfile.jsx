import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BasketCard from "@/components/baskets/BasketCard";
import StarRating from "@/components/common/StarRating";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft,
  ShoppingBag,
  Star,
  MapPin,
  CheckCircle,
  Calendar,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function SellerProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sellerId = urlParams.get('id');

  const { data: seller, isLoading: loadingSeller } = useQuery({
    queryKey: ['seller', sellerId],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: sellerId });
      return users[0];
    },
    enabled: !!sellerId,
  });

  const { data: baskets = [], isLoading: loadingBaskets } = useQuery({
    queryKey: ['sellerBaskets', sellerId],
    queryFn: () => base44.entities.Basket.filter({ 
      seller_id: sellerId,
      status: 'available'
    }, '-created_date'),
    enabled: !!sellerId,
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['sellerReviews', sellerId],
    queryFn: () => base44.entities.Review.filter({ seller_id: sellerId }, '-created_date'),
    enabled: !!sellerId,
  });

  if (loadingSeller) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendeur introuvable</h1>
        <p className="text-gray-500 mb-6">Ce profil n'existe pas ou a été supprimé.</p>
        <Link to={createPageUrl('Home')}>
          <Button>Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const stats = [
    { 
      label: "Paniers vendus", 
      value: seller.baskets_sold || 0, 
      icon: ShoppingBag 
    },
    { 
      label: "Note moyenne", 
      value: seller.average_rating?.toFixed(1) || '-', 
      icon: Star 
    },
    { 
      label: "Avis", 
      value: seller.total_reviews || 0, 
      icon: Star 
    },
  ];

  return (
    <div className="pb-24 lg:pb-8">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <Card className="p-6 lg:p-8 border-0 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={seller.avatar_url} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-2xl font-semibold">
                {seller.full_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">
                {seller.full_name}
              </h1>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                <Badge className="bg-emerald-100 text-emerald-700">
                  {seller.seller_type === 'commercant' ? '🏪 Commerçant' : '👤 Particulier'}
                </Badge>
                
                {seller.is_verified && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vérifié
                  </Badge>
                )}
              </div>

              {seller.address && (
                <p className="flex items-center justify-center sm:justify-start gap-1.5 text-gray-500 mt-2">
                  <MapPin className="w-4 h-4" />
                  {seller.address.split(',')[0]}
                </p>
              )}

              {seller.bio && (
                <p className="text-gray-600 mt-3 max-w-lg">{seller.bio}</p>
              )}
            </div>

            {/* Average Rating */}
            {seller.average_rating && (
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <div className="text-3xl font-bold text-amber-600">{seller.average_rating.toFixed(1)}</div>
                <StarRating rating={seller.average_rating} size="sm" />
                <p className="text-sm text-gray-500 mt-1">{seller.total_reviews} avis</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="baskets">
          <TabsList className="bg-gray-100 p-1 mb-6">
            <TabsTrigger value="baskets" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Paniers disponibles
              <Badge variant="secondary" className="ml-1">{baskets.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              Avis
              <Badge variant="secondary" className="ml-1">{reviews.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="baskets">
            {loadingBaskets ? (
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
                icon={ShoppingBag}
                title="Aucun panier disponible"
                description="Ce vendeur n'a pas de panier disponible pour le moment."
              />
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {loadingReviews ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="p-5 border-0 shadow-sm">
                    <div className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map(review => (
                  <Card key={review.id} className="p-5 border-0 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gray-100 text-gray-600">
                          {review.buyer_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{review.buyer_name}</p>
                          <span className="text-xs text-gray-400">
                            {format(new Date(review.created_date), "d MMM yyyy", { locale: fr })}
                          </span>
                        </div>
                        <StarRating rating={review.rating} size="sm" />
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600">{review.comment}</p>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Star}
                title="Aucun avis"
                description="Ce vendeur n'a pas encore reçu d'avis."
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}