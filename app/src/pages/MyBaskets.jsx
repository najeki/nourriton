import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { COPY } from "@/utils/copyText";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BasketCard from "@/components/baskets/BasketCard";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Pencil,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MyBaskets() {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState('available');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: baskets = [], isLoading } = useQuery({
    queryKey: ['myBaskets', currentUser?.id],
    queryFn: () => base44.entities.Basket.filter({ seller_id: currentUser.id }, '-created_date'),
    enabled: !!currentUser?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Basket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['myBaskets']);
      toast.success('Panier supprimé');
      setDeleteId(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.Basket.update(id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['myBaskets']);
      toast.success('Panier annulé');
    }
  });

  const filterBaskets = (status) => {
    if (status === 'available') {
      return baskets.filter(b => b.status === 'available');
    }
    if (status === 'reserved') {
      return baskets.filter(b => b.status === 'reserved');
    }
    if (status === 'completed') {
      return baskets.filter(b => ['sold', 'expired', 'cancelled'].includes(b.status));
    }
    return baskets;
  };

  const statusConfig = {
    available: { label: 'Disponible', color: 'bg-emerald-100 text-emerald-700', icon: Clock },
    reserved: { label: 'Réservé', color: 'bg-amber-100 text-amber-700', icon: Clock },
    sold: { label: 'Vendu', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
    expired: { label: 'Expiré', color: 'bg-gray-100 text-gray-700', icon: XCircle },
    cancelled: { label: 'Annulé', color: 'bg-rose-100 text-rose-700', icon: XCircle },
  };

  const renderBasketList = (filteredBaskets) => {
    if (isLoading) {
      return (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <div className="flex gap-4">
                <Skeleton className="w-24 h-24 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      );
    }

    if (filteredBaskets.length === 0) {
      return (
        <EmptyState
          icon={ShoppingBag}
          title="Aucun panier"
          description={
            activeTab === 'available'
              ? COPY.descriptions.noBaskets
              : "Aucun panier dans cette catégorie."
          }
          actionLabel={activeTab === 'available' ? "Créer un panier" : undefined}
          onAction={activeTab === 'available' ? () => window.location.href = createPageUrl('CreateBasket') : undefined}
        />
      );
    }

    return (
      <div className="grid gap-4">
        {filteredBaskets.map(basket => {
          const config = statusConfig[basket.status];
          return (
            <Card key={basket.id} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-4">
                <Link
                  to={createPageUrl('BasketDetail') + `?id=${basket.id}`}
                  className="shrink-0"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50">
                    {basket.photo_url ? (
                      <img
                        src={basket.photo_url}
                        alt={basket.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-emerald-200" />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={createPageUrl('BasketDetail') + `?id=${basket.id}`}>
                        <h3 className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                          {basket.title}
                        </h3>
                      </Link>
                      <Badge className={`${config.color} mt-1`}>
                        {config.label}
                      </Badge>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">
                      {basket.price?.toFixed(2)}€
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {basket.pickup_address?.split(',')[0]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {basket.pickup_date && format(new Date(basket.pickup_date), "d MMM", { locale: fr })}
                    </span>
                  </div>

                  {basket.status === 'available' && (
                    <div className="mt-3 flex gap-2">
                      <Link to={createPageUrl('CreateBasket') + `?edit=${basket.id}`}>
                        <Button variant="outline" size="sm" className="gap-1">
                          <Pencil className="w-3.5 h-3.5" />
                          Modifier
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => setDeleteId(basket.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </Button>
                    </div>
                  )}

                  {basket.status === 'reserved' && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => cancelMutation.mutate(basket.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Annuler la réservation
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mes paniers</h1>
            <p className="text-gray-500 mt-1">{baskets.length} panier{baskets.length !== 1 ? 's' : ''} au total</p>
          </div>
          <Link to={createPageUrl('CreateBasket')}>
            <Button className="bg-emerald-500 hover:bg-emerald-600 gap-2">
              <Plus className="w-4 h-4" />
              Nouveau panier
            </Button>
          </Link>
        </div>

        {/* Sales Counter & Warning for Particuliers */}
        {currentUser?.seller_type === 'particulier' && (
          <>
            <Card className="p-6 mb-6 border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-blue-50">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Activité de redistribution</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Vous avez partagé <strong className="text-emerald-600">{currentUser.sales_count || 0}</strong> panier{(currentUser.sales_count || 0) !== 1 ? 's' : ''} ce mois-ci (limite légale : 10/mois)
                  </p>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${(currentUser.sales_count || 0) >= 8
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                        }`}
                      style={{ width: `${Math.min(((currentUser.sales_count || 0) / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {(currentUser.sales_count || 0) >= 8 && (
              <Alert className="mb-6 border-amber-500 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Limite proche</AlertTitle>
                <AlertDescription className="text-amber-800 text-sm">
                  Vous approchez de la limite légale de 10 paniers par mois pour les particuliers. Après avoir partagé {10 - (currentUser.sales_count || 0)} panier{(10 - (currentUser.sales_count || 0)) !== 1 ? 's' : ''} supplémentaire{(10 - (currentUser.sales_count || 0)) !== 1 ? 's' : ''}, vous devrez attendre le mois prochain ou passer au statut commerçant.
                </AlertDescription>
              </Alert>
            )}

            {(currentUser.sales_count || 0) >= 10 && (
              <Alert className="mb-6 border-rose-500 bg-rose-50">
                <XCircle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="text-rose-900">Limite atteinte</AlertTitle>
                <AlertDescription className="text-rose-800 text-sm">
                  Vous avez atteint la limite légale de 10 paniers par mois. La création de nouveaux paniers est temporairement désactivée jusqu'au mois prochain. Pour continuer, veuillez passer au statut commerçant dans votre profil.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 p-1 mb-6">
            <TabsTrigger value="available" className="gap-2">
              <Clock className="w-4 h-4" />
              Disponibles
              <Badge variant="secondary" className="ml-1">
                {filterBaskets('available').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="reserved" className="gap-2">
              <Clock className="w-4 h-4" />
              Réservés
              <Badge variant="secondary" className="ml-1">
                {filterBaskets('reserved').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Terminés
              <Badge variant="secondary" className="ml-1">
                {filterBaskets('completed').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            {renderBasketList(filterBaskets('available'))}
          </TabsContent>
          <TabsContent value="reserved">
            {renderBasketList(filterBaskets('reserved'))}
          </TabsContent>
          <TabsContent value="completed">
            {renderBasketList(filterBaskets('completed'))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce panier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le panier sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 hover:bg-rose-600"
              onClick={() => deleteMutation.mutate(deleteId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}