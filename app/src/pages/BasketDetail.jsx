import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { COPY } from "@/utils/copyText";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import StarRating from "@/components/common/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MapPin,
  Clock,
  Calendar,
  ArrowLeft,
  ShoppingBag,
  User,
  Star,
  Flag,
  CheckCircle,
  Leaf,
  Loader2,
  MessageSquare
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryLabels = {
  fruits_legumes: "Fruits & Légumes",
  boulangerie: "Boulangerie",
  epicerie: "Épicerie",
  produits_frais: "Produits frais",
  plats_prepares: "Plats préparés",
  mixte: "Mixte"
};

export default function BasketDetail() {
  const navigate = useNavigate();
  const { navigateToLogin, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const basketId = urlParams.get('id');

  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isReserving, setIsReserving] = useState(false);
  const [isCreatingConv, setIsCreatingConv] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: basket, isLoading } = useQuery({
    queryKey: ['basket', basketId],
    queryFn: async () => {
      const baskets = await base44.entities.Basket.filter({ id: basketId });
      return baskets[0];
    },
    enabled: !!basketId,
  });

  const { data: sellerReviews = [] } = useQuery({
    queryKey: ['reviews', basket?.seller_id],
    queryFn: () => base44.entities.Review.filter({ seller_id: basket.seller_id }, '-created_date', 5),
    enabled: !!basket?.seller_id,
  });

  const { data: seller } = useQuery({
    queryKey: ['seller', basket?.seller_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: basket.seller_id });
      return users[0];
    },
    enabled: !!basket?.seller_id,
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      setIsReserving(true);
      const response = await base44.functions.invoke('createCheckout', {
        basket_id: basketId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setShowReserveDialog(false);
      // Rediriger vers Stripe Checkout
      window.location.href = data.checkout_url;
    },
    onError: (error) => {
      setIsReserving(false);
      toast.error(error.response?.data?.error || 'Erreur lors du paiement');
    }
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Report.create({
        reporter_id: currentUser.id,
        reporter_name: currentUser.full_name,
        reported_basket_id: basketId,
        reported_user_id: basket.seller_id,
        type: 'inappropriate_content',
        description: reportReason,
        status: 'pending'
      });
    },
    onSuccess: () => {
      setShowReportDialog(false);
      setReportReason('');
      toast.success('Signalement envoyé');
    }
  });

  const handleContact = async () => {
    setIsCreatingConv(true);
    try {
      // Utilisation de filtres d'égalité simples comme demandé
      const existingConvs = await base44.entities.Conversation.filter({
        basket_id: basketId,
        buyer_id: currentUser.id,
        seller_id: basket.seller_id
      });

      if (existingConvs.length > 0) {
        navigate(createPageUrl('Messages') + `/${existingConvs[0].id}`);
      } else {
        const conv = await base44.entities.Conversation.create({
          basket_id: basketId,
          buyer_id: currentUser.id,
          buyer_name: currentUser.full_name,
          seller_id: basket.seller_id,
          seller_name: basket.seller_name,
          basket_title: basket.title,
          last_message_at: new Date().toISOString(),
          unread_count_buyer: 0,
          unread_count_seller: 0
        });
        navigate(createPageUrl('Messages') + `/${conv.id}`);
      }
    } catch (error) {
      console.error("Error creating/finding conversation:", error);
      toast.error('Erreur lors de la création de la conversation');
    }
    setIsCreatingConv(false);
  };

  const handleDonationReservation = async () => {
    setIsReserving(true);
    try {
      const { data } = await base44.functions.invoke('reserveDonation', {
        basket_id: basketId
      });

      if (data.success) {
        toast.success("Panier réservé avec succès !");
        navigate(createPageUrl('Messages') + `/${data.conversation_id}`);
      } else {
        toast.error("Erreur lors de la réservation");
      }
    } catch (error) {
      console.error("Donation reservation error:", error);
      toast.error("Une erreur est survenue");
    } finally {
      setIsReserving(false);
    }
  };

  const handleCreateStripeSession = async () => {
    setIsCreatingConv(true);
    try {
      const existingConvs = await base44.entities.Conversation.filter({
        basket_id: basketId,
        buyer_id: currentUser.id
      });

      if (existingConvs.length > 0) {
        navigate(createPageUrl('Messages'));
      } else {
        await base44.entities.Conversation.create({
          basket_id: basketId,
          basket_title: basket.title,
          buyer_id: currentUser.id,
          buyer_name: currentUser.full_name,
          seller_id: basket.seller_id,
          seller_name: basket.seller_name,
          last_message_at: new Date().toISOString(),
          unread_count_buyer: 0,
          unread_count_seller: 0
        });
        navigate(createPageUrl('Messages'));
      }
    } catch (error) {
      toast.error('Erreur lors de la création de la conversation');
    }
    setIsCreatingConv(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!basket) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Panier introuvable</h1>
        <p className="text-gray-500 mb-6">Ce panier n'existe plus ou a été supprimé.</p>
        <Link to={createPageUrl('Home')}>
          <Button>Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const discount = basket.original_price
    ? Math.round((1 - basket.price / basket.original_price) * 100)
    : null;

  const isOwnBasket = currentUser?.id === basket.seller_id;
  const isReserved = basket.status === 'reserved';
  const isSold = basket.status === 'sold';

  return (
    <div className="pb-24 lg:pb-8">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Image */}
          <div className="relative mb-6 lg:mb-0">
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50 to-amber-50">
              {basket.photo_url ? (
                <img
                  src={basket.photo_url}
                  alt={basket.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-32 h-32 text-emerald-200" />
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {isReserved && (
                <Badge className="bg-amber-500 text-white px-3 py-1">
                  Réservé
                </Badge>
              )}
              {isSold && (
                <Badge className="bg-gray-500 text-white px-3 py-1">
                  Vendu
                </Badge>
              )}
              {discount && !isReserved && !isSold && (
                <Badge className="bg-rose-500 text-white font-bold px-3 py-1">
                  -{discount}%
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="mb-6">
              {basket.category && (
                <Badge variant="secondary" className="mb-3">
                  {categoryLabels[basket.category]}
                </Badge>
              )}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{basket.title}</h1>

              <div className="flex items-end gap-2 mb-4">
                <span className="text-3xl font-bold text-emerald-600">
                  {Number(basket.price) === 0 ? "Gratuit" : `${basket.price}€`}
                </span>
                {basket.original_price && Number(basket.original_price) > 0 && Number(basket.price) > 0 && (
                  <span className="text-lg text-gray-400 line-through mb-1">
                    {basket.original_price}€
                  </span>
                )}
              </div>

              {basket.status === 'available' ? (
                currentUser && currentUser.id !== basket.seller_id ? (
                  <Button
                    className="w-full h-12 text-lg"
                    onClick={() => {
                      if (Number(basket.price) === 0) {
                        handleDonationReservation();
                      } else {
                        setShowReserveDialog(true);
                      }
                    }}
                    disabled={isReserving}
                  >
                    {isReserving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Réservation en cours...
                      </>
                    ) : (
                      Number(basket.price) === 0 ? "Réserver (Gratuit)" : COPY.cta.getBasket
                    )}
                  </Button>
                ) : (
                  <Button
                    className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => navigateToLogin()}
                  >
                    Se connecter pour réserver
                  </Button>
                )
              ) : (
                <div className="bg-gray-100 text-gray-500 p-4 rounded-lg text-center font-medium">
                  Ce panier est déjà réservé
                </div>
              )}
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3 mb-6">
                <Leaf className="w-5 h-5" />
                <span className="font-medium">Panier anti-gaspillage</span>
              </div>
            </div>

            {/* Pickup Info */}
            <Card className="p-6 mb-6 bg-gray-50 border-0">
              <h3 className="font-semibold text-gray-900 mb-4">Informations de retrait</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Lieu de rendez-vous</p>
                    {(basket.reserved_by === currentUser?.id || basket.seller_id === currentUser?.id) ? (
                      <p className="text-gray-600">{basket.pickup_address}</p>
                    ) : (
                      <p className="text-gray-600">
                        {basket.pickup_address?.split(',').slice(0, -1).join(',').trim() || basket.pickup_address?.split(',')[0]}
                        <span className="block text-xs text-amber-600 mt-1">
                          📍 Lieu exact visible après réservation
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Date</p>
                    <p className="text-gray-600">
                      {basket.pickup_date && format(new Date(basket.pickup_date), "EEEE d MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Créneau horaire</p>
                    <p className="text-gray-600">{basket.pickup_time_start} - {basket.pickup_time_end}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Description */}
            {basket.description && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">{basket.description}</p>
              </div>
            )}

            {/* Contents */}
            {basket.contents && basket.contents.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Contenu du panier</h3>
                <div className="flex flex-wrap gap-2">
                  {basket.contents.map((item, index) => (
                    <Badge key={index} variant="outline" className="px-3 py-1">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Seller Info */}
            <Card className="p-6 mb-6 border-0 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 border-2 border-emerald-100">
                    <AvatarImage src={seller?.avatar_url} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                      {basket.seller_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900">{basket.seller_name}</p>
                    <p className="text-sm text-gray-500">
                      {basket.seller_type === 'commercant' ? '🏪 Commerçant' : '👤 Particulier'}
                    </p>
                    {seller?.average_rating && (
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={seller.average_rating} size="sm" />
                        <span className="text-sm text-gray-500">
                          ({seller.total_reviews || 0} avis)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Link to={createPageUrl('SellerProfile') + `?id=${basket.seller_id}`}>
                  <Button variant="outline" size="sm">
                    Voir le profil
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              {!isOwnBasket && basket.status === 'available' && (
                <Button
                  className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => setShowReserveDialog(true)}
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {COPY.cta.getBasket}
                </Button>
              )}

              <div className="flex gap-3">
                {!isOwnBasket && (
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={handleContact}
                    disabled={isCreatingConv}
                  >
                    {isCreatingConv ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="w-5 h-5 mr-2" />
                    )}
                    Contacter
                  </Button>
                )}

                {isOwnBasket && (
                  <Link to={createPageUrl('CreateBasket') + `?edit=${basketId}`} className="flex-1">
                    <Button variant="outline" className="w-full h-12">
                      Modifier le panier
                    </Button>
                  </Link>
                )}

                {!isOwnBasket && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => setShowReportDialog(true)}
                  >
                    <Flag className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Confirm Pickup Action for Buyer */}
            {isReserved && currentUser?.id === basket.reserved_by && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <h4 className="font-semibold text-emerald-900 mb-2">Avez-vous récupéré ce panier ?</h4>
                <p className="text-sm text-emerald-800 mb-4">
                  Confirmez la réception pour débloquer le paiement au vendeur.
                  Assurez-vous d'avoir bien vérifié le contenu du panier.
                </p>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    if (confirm("Confirmer la bonne réception du panier ? Cette action est définitive.")) {
                      try {
                        setIsReserving(true);
                        const { data } = await base44.functions.invoke('confirmBasketPickup', {
                          basket_id: basketId
                        });

                        if (data.success) {
                          toast.success('Réception confirmée ! Bon appétit !');
                          queryClient.invalidateQueries(['basket', basketId]);
                        } else {
                          toast.error(data.error || 'Erreur lors de la confirmation');
                        }
                      } catch (error) {
                        console.error(error);
                        toast.error('Erreur technique');
                      } finally {
                        setIsReserving(false);
                      }
                    }
                  }}
                  disabled={isReserving}
                >
                  {isReserving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Je confirme la réception
                </Button>
              </div>
            )}

          </div>
        </div>

        {/* Reviews Section */}
        {sellerReviews.length > 0 && (
          <div className="mt-12 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Avis sur le vendeur</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {sellerReviews.map(review => (
                <Card key={review.id} className="p-5 border-0 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {review.buyer_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{review.buyer_name}</p>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-600">{review.comment}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reserve Dialog */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réserver ce panier</DialogTitle>
            <DialogDescription>
              Votre carte sera autorisée mais le paiement ne sera débité qu'après votre confirmation de récupération du panier.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 rounded-xl p-4 my-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Panier</span>
              <span className="font-medium">{basket?.title}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Prix</span>
              <span className="font-bold text-emerald-600">{basket?.price?.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Retrait</span>
              <span className="font-medium">{basket?.pickup_time_start} - {basket?.pickup_time_end}</span>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="font-semibold text-blue-900">🔒 Protection acheteur</p>
            <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Votre carte est autorisée mais pas débitée immédiatement</li>
              <li>Discutez avec le vendeur pour organiser la remise</li>
              <li>Le paiement n'est prélevé qu'après confirmation de récupération</li>
              <li>Vous pouvez annuler avant de récupérer le panier</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReserveDialog(false)}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => reserveMutation.mutate()}
              disabled={reserveMutation.isPending || isReserving}
            >
              {(reserveMutation.isPending || isReserving) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Réserver ce panier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler ce panier</DialogTitle>
            <DialogDescription>
              Décrivez le problème rencontré avec ce panier ou ce vendeur.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Décrivez le problème..."
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => reportMutation.mutate()}
              disabled={!reportReason || reportMutation.isPending}
            >
              {reportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Envoyer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}