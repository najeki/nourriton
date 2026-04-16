import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { COPY } from "@/utils/copyText";
import LocationPicker from "@/components/common/LocationPicker";
import StarRating from "@/components/common/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  User,
  Camera,
  ShoppingBag,
  Star,
  MapPin,
  Phone,
  Mail,
  Edit,
  Save,
  Loader2,
  CheckCircle,
  TrendingDown,
  Leaf,
  Upload,
  FileText,
  Clock,
  XCircle,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  Info
} from "lucide-react";

export default function Profile() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [verificationData, setVerificationData] = useState({
    siret: '',
    business_name: '',
    business_address: '',
    document_url: ''
  });

  const { data: currentUser, isLoading, refetch } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stripeStatus, refetch: refetchStripe } = useQuery({
    queryKey: ['stripeStatus'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('checkStripeAccountStatus');
      return data;
    },
    enabled: !!currentUser,
  });

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    bio: '',
    address: '',
    latitude: null,
    longitude: null,
    user_type: 'buyer',
    seller_type: 'particulier',
    avatar_url: ''
  });

  React.useEffect(() => {
    if (currentUser) {
      setFormData({
        full_name: currentUser.full_name || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        address: currentUser.address || '',
        latitude: currentUser.latitude,
        longitude: currentUser.longitude,
        user_type: currentUser.user_type || 'buyer',
        seller_type: currentUser.seller_type || 'particulier',
        avatar_url: currentUser.avatar_url || ''
      });
    }
  }, [currentUser]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_success') === 'true') {
      toast.success('Compte Stripe connecté avec succès !');
      refetchStripe();
      // Utiliser navigate au lieu de replaceState
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (params.get('stripe_refresh') === 'true') {
      toast.error('La connexion Stripe a échoué, veuillez réessayer');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [refetchStripe]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      setIsEditing(false);
      toast.success('Profil mis à jour !');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, avatar_url: file_url }));
      await base44.auth.updateMe({ avatar_url: file_url });
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Photo de profil mise à jour');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setIsUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleLocationChange = (location) => {
    setFormData(prev => ({
      ...prev,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude
    }));
  };

  const handleDocumentUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setVerificationData(prev => ({ ...prev, document_url: file_url }));
      toast.success('Document téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setIsUploadingDoc(false);
  };

  const submitVerificationMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe({
        verification_status: 'pending',
        verification_documents: {
          ...data,
          submitted_at: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      setShowVerificationForm(false);
      toast.success('Demande de vérification envoyée !');
    },
    onError: () => {
      toast.error('Erreur lors de la soumission');
    }
  });

  const handleVerificationSubmit = (e) => {
    e.preventDefault();
    if (!verificationData.siret || !verificationData.business_name || !verificationData.document_url) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    submitVerificationMutation.mutate(verificationData);
  };

  const handleStripeConnect = async () => {
    setStripeConnecting(true);
    try {
      const { data } = await base44.functions.invoke('createStripeConnectAccount');
      window.location.href = data.url;
    } catch (error) {
      toast.error('Erreur lors de la connexion à Stripe');
      setStripeConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const { data: myTransactions = [] } = useQuery({
    queryKey: ['myCompletedTransactions', currentUser?.id],
    queryFn: () => base44.entities.Transaction.filter({
      buyer_id: currentUser.id,
      status: 'completed'
    }),
    enabled: !!currentUser?.id,
  });

  const totalSaved = myTransactions.reduce((sum, t) => sum + (t.price || 0), 0);
  const kgSaved = Math.round(myTransactions.length * 1.5); // Estimation: 1.5kg par panier

  const stats = [
    {
      label: "Paniers sauvés",
      value: myTransactions.length,
      icon: ShoppingBag,
      color: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Économisés",
      value: totalSaved > 0 ? `${totalSaved.toFixed(0)}€` : '-',
      icon: TrendingDown,
      color: "text-blue-600 bg-blue-50"
    },
    {
      label: "Nourriture sauvée",
      value: kgSaved > 0 ? `${kgSaved}kg` : '-',
      icon: Leaf,
      color: "text-green-600 bg-green-50"
    },
  ];

  const sellerStats = [
    {
      label: "Paniers vendus",
      value: currentUser?.baskets_sold || 0,
      icon: ShoppingBag,
      color: "text-emerald-600 bg-emerald-50"
    },
    {
      label: "Note moyenne",
      value: currentUser?.average_rating?.toFixed(1) || '-',
      icon: Star,
      color: "text-amber-600 bg-amber-50"
    },
    {
      label: "Avis reçus",
      value: currentUser?.total_reviews || 0,
      icon: Star,
      color: "text-blue-600 bg-blue-50"
    },
  ];

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="p-6 lg:p-8 border-0 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="w-28 h-28 border-4 border-white shadow-lg">
                <AvatarImage src={formData.avatar_url || currentUser?.avatar_url} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-3xl font-semibold">
                  {currentUser?.full_name?.charAt(0) || currentUser?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-emerald-500 rounded-full text-white cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentUser?.full_name || 'Utilisateur'}
              </h1>
              <p className="text-gray-500">{currentUser?.email}</p>

              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                {currentUser?.user_type === 'seller' || currentUser?.user_type === 'both' ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    {currentUser?.seller_type === 'commercant' ? '🏪 Commerçant' : '👤 Vendeur'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Acheteur</Badge>
                )}

                {currentUser?.is_verified && (
                  <Badge className="bg-blue-100 text-blue-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Vérifié
                  </Badge>
                )}

                {currentUser?.seller_type === 'commercant' && currentUser?.verification_status === 'pending' && (
                  <Badge className="bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Vérification en cours
                  </Badge>
                )}

                {currentUser?.seller_type === 'commercant' && currentUser?.verification_status === 'approved' && (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Commerçant vérifié
                  </Badge>
                )}

                {currentUser?.seller_type === 'commercant' && currentUser?.verification_status === 'rejected' && (
                  <Badge className="bg-red-100 text-red-700">
                    <XCircle className="w-3 h-3 mr-1" />
                    Vérification refusée
                  </Badge>
                )}
              </div>
            </div>

            {/* Edit Button */}
            {!isEditing && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </Button>
            )}
          </div>

          {/* Stats - Mon impact */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">Mon impact anti-gaspi</h3>
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="text-center p-4 rounded-xl bg-gray-50">
                  <div className={`w-10 h-10 mx-auto mb-2 rounded-full ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Seller stats */}
          {(currentUser?.user_type === 'seller' || currentUser?.user_type === 'both') && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-4">En tant que vendeur</h3>
              <div className="grid grid-cols-3 gap-4">
                {sellerStats.map((stat, index) => (
                  <div key={index} className="text-center p-4 rounded-xl bg-gray-50">
                    <div className={`w-10 h-10 mx-auto mb-2 rounded-full ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Verification Section for Commercants */}
        {currentUser?.seller_type === 'commercant' && currentUser?.verification_status === 'none' && !showVerificationForm && (
          <Card className="p-6 border-0 shadow-sm mb-8 bg-amber-50 border-l-4 border-amber-500">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Vérification requise</h3>
                <p className="text-amber-800 text-sm mb-4">
                  En tant que commerçant, vous devez faire vérifier votre compte avant de pouvoir publier des paniers.
                  Veuillez soumettre vos documents professionnels.
                </p>
                <Button
                  onClick={() => setShowVerificationForm(true)}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Soumettre mes documents
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Verification Form */}
        {showVerificationForm && (
          <form onSubmit={handleVerificationSubmit}>
            <Card className="p-6 lg:p-8 border-0 shadow-sm mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Vérification commerçant</h2>
              <p className="text-gray-600 mb-6">
                Veuillez fournir les informations suivantes pour faire vérifier votre statut de commerçant.
              </p>

              <div className="space-y-6">
                <div>
                  <Label htmlFor="siret">
                    Numéro SIRET <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="siret"
                    value={verificationData.siret}
                    onChange={(e) => setVerificationData(prev => ({ ...prev, siret: e.target.value }))}
                    placeholder="123 456 789 00012"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="business_name">
                    Nom commercial <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="business_name"
                    value={verificationData.business_name}
                    onChange={(e) => setVerificationData(prev => ({ ...prev, business_name: e.target.value }))}
                    placeholder="Ex: Boulangerie Dupont"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="business_address">Adresse professionnelle</Label>
                  <Input
                    id="business_address"
                    value={verificationData.business_address}
                    onChange={(e) => setVerificationData(prev => ({ ...prev, business_address: e.target.value }))}
                    placeholder="Adresse complète de votre commerce"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>
                    Document justificatif (Kbis, carte commerçant, etc.) <span className="text-rose-500">*</span>
                  </Label>
                  <div className="mt-2">
                    {verificationData.document_url ? (
                      <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <span className="text-sm text-emerald-700 flex-1">Document téléchargé</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setVerificationData(prev => ({ ...prev, document_url: '' }))}
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                        {isUploadingDoc ? (
                          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400" />
                            <span className="text-gray-600">Cliquez pour télécharger un document</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleDocumentUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Formats acceptés : PDF, JPG, PNG (max 10MB)
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowVerificationForm(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    disabled={submitVerificationMutation.isPending}
                  >
                    {submitVerificationMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Soumettre ma demande
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        )}

        {/* Rejected verification notice */}
        {currentUser?.seller_type === 'commercant' && currentUser?.verification_status === 'rejected' && (
          <Card className="p-6 border-0 shadow-sm mb-8 bg-red-50 border-l-4 border-red-500">
            <div className="flex items-start gap-4">
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Demande refusée</h3>
                {currentUser.verification_notes && (
                  <p className="text-red-800 text-sm mb-4">
                    Motif : {currentUser.verification_notes}
                  </p>
                )}
                <Button
                  onClick={() => setShowVerificationForm(true)}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Soumettre une nouvelle demande
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Stripe Connect Section */}
        {(currentUser?.user_type === 'seller' || currentUser?.user_type === 'both') && (
          <Card className="p-6 border-0 shadow-sm mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Compte de paiement</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Connectez votre compte bancaire pour recevoir vos paiements
                </p>
              </div>
              {stripeStatus?.onboarding_completed && (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connecté
                </Badge>
              )}
            </div>

            {!stripeStatus?.onboarding_completed ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Pourquoi connecter mon compte bancaire ?</p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li>Pour recevoir vos paiements automatiquement après chaque vente</li>
                        <li>Sécurisé par Stripe, leader mondial des paiements en ligne</li>
                        <li>{COPY.descriptions.requireForSelling}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStripeConnect}
                  disabled={stripeConnecting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  {stripeConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Connecter mon compte bancaire
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Compte bancaire connecté
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">Paiements activés</div>
                    <div className="font-semibold text-gray-900">
                      {stripeStatus?.charges_enabled ? '✓ Oui' : '✗ Non'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-1">Virements activés</div>
                    <div className="font-semibold text-gray-900">
                      {stripeStatus?.payouts_enabled ? '✓ Oui' : '✗ Non'}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStripeConnect}
                  variant="outline"
                  className="w-full"
                >
                  Gérer mon compte bancaire
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Edit Form or Profile Details */}
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <Card className="p-6 lg:p-8 border-0 shadow-sm space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Modifier mon profil</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">Nom complet</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Parlez un peu de vous..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label>Adresse par défaut</Label>
                <div className="mt-1">
                  <LocationPicker
                    onLocationChange={handleLocationChange}
                    initialAddress={formData.address}
                    initialLat={formData.latitude}
                    initialLng={formData.longitude}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Je suis</Label>
                  <Select
                    value={formData.user_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, user_type: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Acheteur uniquement</SelectItem>
                      <SelectItem value="seller">Vendeur uniquement</SelectItem>
                      <SelectItem value="both">Acheteur et vendeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.user_type === 'seller' || formData.user_type === 'both') && (
                  <div>
                    <Label>Type de vendeur</Label>
                    <Select
                      value={formData.seller_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, seller_type: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="particulier">👤 Particulier</SelectItem>
                        <SelectItem value="commercant">🏪 Commerçant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </Card>
          </form>
        ) : (
          <Card className="p-6 lg:p-8 border-0 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Informations</h2>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5 text-emerald-500" />
                <span>{currentUser?.email}</span>
              </div>

              {currentUser?.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-5 h-5 text-emerald-500" />
                  <span>{currentUser.phone}</span>
                </div>
              )}

              {currentUser?.address && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-5 h-5 text-emerald-500" />
                  <span>{currentUser.address}</span>
                </div>
              )}

              {currentUser?.bio && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-gray-600">{currentUser.bio}</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}