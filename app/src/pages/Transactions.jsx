import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmptyState from "@/components/common/EmptyState";
import StarRating from "@/components/common/StarRating";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  XCircle,
  MapPin,
  Calendar,
  ArrowRight,
  Star,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Transactions() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewTransaction, setReviewTransaction] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Transactions as buyer
  const { data: buyerTransactions = [], isLoading: loadingBuyer } = useQuery({
    queryKey: ['transactions', 'buyer', currentUser?.id],
    queryFn: () => base44.entities.Transaction.filter({ buyer_id: currentUser.id }, '-created_date'),
    enabled: !!currentUser?.id,
  });

  // Transactions as seller
  const { data: sellerTransactions = [], isLoading: loadingSeller } = useQuery({
    queryKey: ['transactions', 'seller', currentUser?.id],
    queryFn: () => base44.entities.Transaction.filter({ seller_id: currentUser.id }, '-created_date'),
    enabled: !!currentUser?.id,
  });

  const completeMutation = useMutation({
    mutationFn: async (transactionId) => {
      // Le vendeur ne peut plus marquer comme complété
      // C'est l'acheteur qui doit confirmer la récupération
      toast.info('L\'acheteur doit confirmer la récupération du panier');
    },
    onSuccess: () => {
      // Pas utilisé
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (transactionId) => {
      const transaction = [...buyerTransactions, ...sellerTransactions].find(t => t.id === transactionId);
      
      // Annuler le PaymentIntent sur Stripe si la transaction est en attente
      if (transaction.payment_intent_id && transaction.status === 'pending') {
        try {
          await base44.functions.invoke('cancelPaymentIntent', { 
            payment_intent_id: transaction.payment_intent_id 
          });
        } catch (error) {
          console.error('Erreur annulation Stripe:', error);
        }
      }

      await base44.asServiceRole.entities.Transaction.update(transactionId, {
        status: 'cancelled'
      });

      await base44.asServiceRole.entities.Basket.update(transaction.basket_id, {
        status: 'available',
        reserved_by: null,
        reserved_at: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      queryClient.invalidateQueries(['baskets']);
      toast.success('Réservation annulée');
    }
  });

  const confirmPickupMutation = useMutation({
    mutationFn: async (transactionId) => {
      // Appeler la fonction backend qui va capturer le paiement
      await base44.functions.invoke('capturePayment', { transaction_id: transactionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      toast.success('Récupération confirmée et paiement effectué !');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la confirmation');
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      // Create review
      await base44.entities.Review.create({
        seller_id: reviewTransaction.seller_id,
        buyer_id: currentUser.id,
        buyer_name: currentUser.full_name,
        transaction_id: reviewTransaction.id,
        rating: reviewData.rating,
        comment: reviewData.comment
      });

      // Update seller average rating
      const reviews = await base44.entities.Review.filter({ seller_id: reviewTransaction.seller_id });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      // Note: Can't update other user's data from frontend, this would need backend function
    },
    onSuccess: () => {
      setReviewTransaction(null);
      setReviewData({ rating: 5, comment: '' });
      toast.success('Merci pour votre avis !');
    }
  });

  const isLoading = loadingBuyer || loadingSeller;
  const allTransactions = [...buyerTransactions, ...sellerTransactions];

  const filterTransactions = (status) => {
    if (status === 'pending') {
      return allTransactions.filter(t => ['pending', 'confirmed'].includes(t.status));
    }
    if (status === 'completed') {
      return allTransactions.filter(t => t.status === 'completed');
    }
    if (status === 'cancelled') {
      return allTransactions.filter(t => t.status === 'cancelled');
    }
    return allTransactions;
  };

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
    confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Terminée', color: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: 'Annulée', color: 'bg-rose-100 text-rose-700' },
  };

  const renderTransactionList = (transactions) => {
    if (isLoading) {
      return (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-6">
              <div className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-xl" />
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

    if (transactions.length === 0) {
      return (
        <EmptyState
          icon={ShoppingBag}
          title="Aucune transaction"
          description={
            activeTab === 'pending' 
              ? "Vous n'avez pas de réservation en cours."
              : "Aucune transaction dans cette catégorie."
          }
          actionLabel="Découvrir les paniers"
          onAction={() => window.location.href = createPageUrl('Home')}
        />
      );
    }

    return (
      <div className="grid gap-4">
        {transactions.map(transaction => {
          const config = statusConfig[transaction.status];
          const isBuyer = transaction.buyer_id === currentUser?.id;
          const isSeller = transaction.seller_id === currentUser?.id;

          return (
            <Card key={transaction.id} className="p-6 border-0 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {transaction.basket_title}
                    </h3>
                    <Badge className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {isBuyer ? `Acheté à ${transaction.seller_name}` : `Vendu à ${transaction.buyer_name}`}
                  </p>
                </div>
                <span className="text-xl font-bold text-emerald-600">
                  {transaction.price?.toFixed(2)}€
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {transaction.pickup_address?.split(',')[0]}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  {transaction.pickup_date && format(new Date(transaction.pickup_date), "d MMMM yyyy", { locale: fr })}
                </span>
                </div>

                {/* Status messages */}
                {transaction.status === 'pending' && !transaction.pickup_confirmed && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-semibold mb-1">💳 Paiement en attente</p>
                  <p>Votre carte a été autorisée mais ne sera débitée qu'après confirmation de récupération du panier.</p>
                </div>
                )}

                {isBuyer && transaction.status === 'pending' && !transaction.pickup_confirmed && new Date(transaction.pickup_date) <= new Date() && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-700">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Le jour du retrait est arrivé ! N'oubliez pas de confirmer la récupération après avoir retiré votre panier.</span>
                </div>
                )}

                <div className="flex gap-2 flex-wrap">
                {/* Seller actions */}
                {isSeller && transaction.status === 'pending' && (
                  <div className="w-full mb-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                    💬 En attente de confirmation de récupération par l'acheteur
                  </div>
                )}

                {/* Buyer actions */}
                {isBuyer && transaction.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-500 hover:bg-emerald-600"
                      onClick={() => confirmPickupMutation.mutate(transaction.id)}
                      disabled={confirmPickupMutation.isPending}
                    >
                      {confirmPickupMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirmer la récupération
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => cancelMutation.mutate(transaction.id)}
                      disabled={cancelMutation.isPending}
                    >
                      {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <XCircle className="w-4 h-4 mr-1" />
                      Annuler la réservation
                    </Button>
                  </>
                )}

                {/* Review button for completed transactions */}
                {isBuyer && transaction.status === 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setReviewTransaction(transaction)}
                  >
                    <Star className="w-4 h-4 mr-1" />
                    Laisser un avis
                  </Button>
                )}

                <Link to={createPageUrl('BasketDetail') + `?id=${transaction.basket_id}`}>
                  <Button size="sm" variant="ghost" className="gap-1">
                    Voir le panier
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Historique</h1>
          <p className="text-gray-500 mt-1">Vos réservations et ventes</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-100 p-1 mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              En cours
              <Badge variant="secondary" className="ml-1">
                {filterTransactions('pending').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Terminées
              <Badge variant="secondary" className="ml-1">
                {filterTransactions('completed').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="gap-2">
              <XCircle className="w-4 h-4" />
              Annulées
              <Badge variant="secondary" className="ml-1">
                {filterTransactions('cancelled').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {renderTransactionList(filterTransactions('pending'))}
          </TabsContent>
          <TabsContent value="completed">
            {renderTransactionList(filterTransactions('completed'))}
          </TabsContent>
          <TabsContent value="cancelled">
            {renderTransactionList(filterTransactions('cancelled'))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewTransaction} onOpenChange={() => setReviewTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laisser un avis</DialogTitle>
            <DialogDescription>
              Comment s'est passée votre expérience avec {reviewTransaction?.seller_name} ?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="flex justify-center">
              <StarRating
                rating={reviewData.rating}
                size="lg"
                interactive
                onRatingChange={(rating) => setReviewData(prev => ({ ...prev, rating }))}
              />
            </div>

            <Textarea
              value={reviewData.comment}
              onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Partagez votre expérience (optionnel)..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTransaction(null)}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Publier l'avis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}