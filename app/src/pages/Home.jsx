import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BasketCard from "@/components/baskets/BasketCard";
import BasketFilters from "@/components/baskets/BasketFilters";
import EmptyState from "@/components/common/EmptyState";
import BasketsMap from "@/components/map/BasketsMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Search,
  Locate,
  ShoppingBag,
  Leaf,
  Heart,
  TrendingDown,
  ArrowRight,
  Loader2,
  Map as MapIcon,
  Grid3x3
} from "lucide-react";

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Home() {
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    sellerType: 'all',
    maxPrice: 50,
    maxDistance: 10
  });
  const [locationError, setLocationError] = useState(null);

  const { data: baskets = [], isLoading } = useQuery({
    queryKey: ['baskets', 'available'],
    queryFn: () => base44.entities.Basket.filter({ status: 'available' }, '-created_date'),
  });

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      setLocationError(null);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });
          setIsLocating(false);
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          setLocationError(error.code === 1 ? "permission_denied" : "generic_error");
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationError("not_supported");
    }
  };

  // Filter and sort baskets
  const safeBaskets = Array.isArray(baskets) ? baskets : [];
  const filteredBaskets = safeBaskets
    .map(basket => {
      let distance = null;
      if (userLocation && basket.pickup_latitude && basket.pickup_longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          basket.pickup_latitude,
          basket.pickup_longitude
        );
      }
      return { ...basket, distance };
    })
    .filter(basket => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          basket.title?.toLowerCase().includes(query) ||
          basket.description?.toLowerCase().includes(query) ||
          basket.seller_name?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category !== 'all' && basket.category !== filters.category) return false;

      // Seller type filter
      if (filters.sellerType !== 'all' && basket.seller_type !== filters.sellerType) return false;

      // Price filter
      if (basket.price > filters.maxPrice) return false;

      // Distance filter (if we have user location)
      if (userLocation && basket.distance !== null && basket.distance > filters.maxDistance) return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by distance if available, otherwise by date
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const stats = [
    { icon: ShoppingBag, label: "Paniers sauvés", value: "2,500+" },
    { icon: Leaf, label: "Tonnes de CO₂ évités", value: "125" },
    { icon: Heart, label: "Familles aidées", value: "1,800+" },
    { icon: TrendingDown, label: "Économie moyenne", value: "60%" },
  ];

  return (
    <div className="pb-24 lg:pb-8">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center text-white mb-10">
            <h1 className="text-4xl lg:text-6xl font-bold mb-4">
              Faites des économies,
              <br />
              <span className="text-amber-300">sauvez de la nourriture</span>
            </h1>
            <p className="text-lg lg:text-xl text-emerald-100 max-w-2xl mx-auto">
              Découvrez des paniers anti-gaspi à petit prix près de chez vous.
              Ensemble, réduisons le gaspillage alimentaire.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-2 shadow-2xl shadow-emerald-900/20">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un panier, un commerçant..."
                    className="w-full pl-12 pr-4 py-6 bg-gray-50 border-gray-100 text-gray-900 placeholder:text-gray-400 rounded-2xl focus:bg-white transition-all text-lg"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                </div>
                <Button 
                  onClick={getCurrentLocation}
                  disabled={isLocating}
                  variant="secondary"
                  className="py-6 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all gap-2"
                >
                  {isLocating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Locate className="w-5 h-5" />
                  )}
                  {userLocation ? 'Position actualisée' : 'Me localiser'}
                </Button>
              </div>
            </div>
            {locationError && (
              <p className="mt-4 text-emerald-100 text-sm flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1">
                <MapPin className="w-4 h-4" />
                {locationError === 'permission_denied' 
                  ? "Veuillez autoriser la géolocalisation pour voir les paniers proches." 
                  : "Erreur lors de la détection de votre position."}
              </p>
            )}

            {userLocation && !locationError && (
              <p className="text-center text-emerald-100 text-sm mt-3 flex items-center justify-center gap-2">
                <MapPin className="w-4 h-4" />
                Position détectée • Affichage par distance
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 p-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-emerald-50 to-amber-50 flex items-center justify-center">
                <stat.icon className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Paniers disponibles</h2>
            <p className="text-gray-500 mt-1">
              {filteredBaskets.length} panier{filteredBaskets.length !== 1 ? 's' : ''} près de chez vous
            </p>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Desktop Filters */}
          <div className="hidden lg:block">
            <BasketFilters filters={filters} setFilters={setFilters} />
          </div>

          {/* Baskets Grid/Map */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="grid" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="grid" className="gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Grille
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-2">
                  <MapIcon className="w-4 h-4" />
                  Carte
                </TabsTrigger>
              </TabsList>

              <TabsContent value="grid">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
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
                ) : filteredBaskets.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBaskets.map(basket => (
                      <BasketCard
                        key={basket.id}
                        basket={basket}
                        distance={basket.distance}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={ShoppingBag}
                    title="Aucun panier disponible"
                    description="Il n'y a pas encore de paniers correspondant à vos critères. Essayez d'élargir vos filtres ou revenez plus tard."
                    actionLabel="Créer mon premier panier"
                    onAction={() => window.location.href = createPageUrl('CreateBasket')}
                  />
                )}
              </TabsContent>

              <TabsContent value="map">
                <div className="h-[600px] rounded-2xl overflow-hidden">
                  <BasketsMap baskets={filteredBaskets} userLocation={userLocation} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
              Vous avez des surplus alimentaires ?
            </h2>
            <p className="text-white/90 mb-6 max-w-lg">
              Vendez vos produits en surplus à petit prix et participez à la lutte contre le gaspillage alimentaire.
            </p>
            <Link to={createPageUrl('CreateBasket')}>
              <Button className="bg-white text-amber-600 hover:bg-white/90 gap-2">
                Créer un panier
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}