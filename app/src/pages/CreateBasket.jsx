import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COPY } from "@/utils/copyText";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LocationPicker from "@/components/common/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  X,
  Plus,
  ShoppingBag,
  Loader2,
  ArrowLeft,
  Info,
  AlertCircle,
  CreditCard,
  XCircle
} from "lucide-react";

const categories = [
  { value: "fruits_legumes", label: "Fruits & Légumes", emoji: "🥬" },
  { value: "boulangerie", label: "Boulangerie", emoji: "🥖" },
  { value: "epicerie", label: "Épicerie", emoji: "🛒" },
  { value: "produits_frais", label: "Produits frais", emoji: "🧀" },
  { value: "plats_prepares", label: "Plats préparés", emoji: "🍲" },
  { value: "mixte", label: "Mixte", emoji: "📦" }
];

export default function CreateBasket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  const [isUploading, setIsUploading] = useState(false);
  const [contentItem, setContentItem] = useState('');
  const [validationState, setValidationState] = useState({
    isValidating: false,
    result: null
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contents: [],
    original_price: '',
    price: '',
    photo_url: '',
    category: '',
    pickup_address: '',
    pickup_latitude: null,
    pickup_longitude: null,
    pickup_date: '',
    pickup_time_start: '',
    pickup_time_end: '',
    is_donation: false
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: stripeStatus } = useQuery({
    queryKey: ['stripeStatus'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('checkStripeAccountStatus');
      return data;
    },
    enabled: !!currentUser,
  });

  const { data: editBasket } = useQuery({
    queryKey: ['basket', editId],
    queryFn: async () => {
      const baskets = await base44.entities.Basket.filter({ id: editId });
      return baskets[0];
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      navigateToLogin();
    }
  }, [isLoadingAuth, isAuthenticated, navigateToLogin]);


  useEffect(() => {
    if (editBasket) {
      setFormData({
        title: editBasket.title || '',
        description: editBasket.description || '',
        contents: editBasket.contents || [],
        original_price: editBasket.original_price || '',
        price: editBasket.price || '',
        photo_url: editBasket.photo_url || '',
        category: editBasket.category || '',
        pickup_address: editBasket.pickup_address || '',
        pickup_latitude: editBasket.pickup_latitude,
        pickup_longitude: editBasket.pickup_longitude,
        pickup_date: editBasket.pickup_date || '',
        pickup_time_start: editBasket.pickup_time_start || '',
        pickup_time_end: editBasket.pickup_time_end || '',
        is_donation: Number(editBasket.price) === 0
      });
    }
  }, [editBasket]);

  // Debounced product validation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.title && formData.category) {
        setValidationState({ isValidating: true, result: null });
        try {
          const { data } = await base44.functions.invoke('validateBasket', {
            title: formData.title,
            description: formData.description,
            category: formData.category,
          });
          setValidationState({ isValidating: false, result: data });
        } catch (error) {
          setValidationState({ isValidating: false, result: null });
        }
      } else {
        setValidationState({ isValidating: false, result: null });
      }
    }, 800); // Debounce 800ms

    return () => clearTimeout(timer);
  }, [formData.title, formData.description, formData.category]);


  const createMutation = useMutation({
    mutationFn: async (data) => {
      const basketData = {
        ...data,
        seller_id: currentUser.id,
        seller_name: currentUser.full_name,
        seller_type: currentUser.seller_type || 'particulier',
        status: 'available',
        price: parseFloat(data.price),
        original_price: data.original_price ? parseFloat(data.original_price) : null
      };

      if (editId) {
        return base44.entities.Basket.update(editId, basketData);
      }
      return base44.entities.Basket.create(basketData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['baskets']);
      toast.success(editId ? 'Panier modifié !' : 'Panier créé avec succès !');
      navigate(createPageUrl('MyBaskets'));
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photo_url: file_url }));
      toast.success('Photo ajoutée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setIsUploading(false);
  };

  const addContentItem = () => {
    if (contentItem.trim()) {
      setFormData(prev => ({
        ...prev,
        contents: [...prev.contents, contentItem.trim()]
      }));
      setContentItem('');
    }
  };

  const removeContentItem = (index) => {
    setFormData(prev => ({
      ...prev,
      contents: prev.contents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.title || !formData.price || !formData.pickup_address || !formData.pickup_date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!formData.photo_url) {
      toast.error('Une photo du panier est obligatoire pour prouver sa véracité');
      return;
    }

    // Vérifier que le vendeur a connecté son compte Stripe
    if (!stripeStatus?.onboarding_completed) {
      toast.error(COPY.warnings.needBankAccount);
      navigate(createPageUrl('Profile'));
      return;
    }

    // Check sales limit for particuliers (only for new baskets, not edits)
    if (!editId && currentUser?.seller_type === 'particulier' && (currentUser.sales_count || 0) >= 10) {
      toast.error('Limite atteinte : vous avez publié 10 paniers ce mois-ci. Passez au statut professionnel pour continuer.');
      return;
    }

    // Check product validation
    if (validationState.result && !validationState.result.valid) {
      toast.error(validationState.result.message || 'Ce produit ne peut pas être listé');
      return;
    }

    // Vérification du statut pour les commerçants
    if (currentUser?.seller_type === 'commercant') {
      if (currentUser.verification_status !== 'approved') {
        toast.error('Votre compte doit être vérifié avant de publier des paniers. Veuillez soumettre vos documents dans votre profil.');
        return;
      }

      if (!formData.original_price) {
        toast.error('Le prix original est obligatoire pour les professionnels');
        return;
      }
      const discount = (1 - formData.price / formData.original_price) * 100;
      if (discount < 60) {
        toast.error('Les professionnels doivent proposer une réduction minimum de 60%');
        return;
      }
    }

    createMutation.mutate(formData);
  };

  const handleLocationChange = (location) => {
    setFormData(prev => ({
      ...prev,
      pickup_address: location.address,
      pickup_latitude: location.latitude,
      pickup_longitude: location.longitude
    }));
  };

  if (isLoadingAuth || (editId && !editBasket)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null; // Will redirect via useEffect

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {editId ? 'Modifier le panier' : 'Créer un panier'}
          </h1>
          <p className="text-gray-500 mt-2">
            Vendez vos surplus alimentaires et aidez à réduire le gaspillage
          </p>
        </div>

        {/* Stripe Connect Warning */}
        {currentUser && !stripeStatus?.onboarding_completed && (
          <Card className="p-6 border-0 shadow-sm bg-rose-50 border-l-4 border-rose-500 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="font-semibold text-rose-900">
                  Compte bancaire non connecté
                </h3>
                <p className="text-sm text-rose-800">
                  {COPY.descriptions.bankAccountRequired}
                </p>
                <Button
                  type="button"
                  onClick={() => navigate(createPageUrl('Profile'))}
                  className="bg-rose-600 hover:bg-rose-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connecter mon compte
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Sales Limit Warning for Particuliers */}
        {currentUser && currentUser.seller_type === 'particulier' && !editId && (
          <>
            {(currentUser.sales_count || 0) >= 10 && (
              <Card className="p-6 border-0 shadow-sm bg-rose-50 border-l-4 border-rose-500 mb-8">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-rose-900">
                      Limite légale atteinte
                    </h3>
                    <p className="text-sm text-rose-800">
                      Vous avez atteint la limite de 10 paniers par mois pour les particuliers. La création de nouveaux paniers est désactivée jusqu'au mois prochain. Pour continuer à redistribuer, veuillez passer au statut professionnel dans votre profil.
                    </p>
                    <Button
                      type="button"
                      onClick={() => navigate(createPageUrl('Profile'))}
                      className="bg-rose-600 hover:bg-rose-700"
                    >
                      Passer au statut professionnel
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(currentUser.sales_count || 0) >= 8 && (currentUser.sales_count || 0) < 10 && (
              <Card className="p-6 border-0 shadow-sm bg-amber-50 border-l-4 border-amber-500 mb-8">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Limite proche
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                      Vous avez partagé {currentUser.sales_count || 0}/10 paniers ce mois-ci. Après {10 - (currentUser.sales_count || 0)} panier{(10 - (currentUser.sales_count || 0)) !== 1 ? 's' : ''} supplémentaire{(10 - (currentUser.sales_count || 0)) !== 1 ? 's' : ''}, vous devrez attendre le mois prochain ou passer au statut professionnel.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Rules Information */}
        {currentUser && (
          <Card className="p-6 border-0 shadow-sm bg-blue-50 border-l-4 border-blue-500 mb-8">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-900">
                  {currentUser.seller_type === 'commercant' ? 'Règles pour les professionnels' : 'Règles pour les particuliers'}
                </h3>
                {currentUser.seller_type === 'commercant' ? (
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Vous devez proposer une réduction minimum de <strong>60%</strong> par rapport au prix de base</li>
                    <li>• Commission : <strong>25%</strong> de chaque vente (minimum 1,09€ si le panier est à moins de 4€)</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Les paniers doivent être <strong>emballés et non entamés</strong></li>
                    <li>• La date de péremption ne doit <strong>pas être dépassée</strong></li>
                    <li>• Commission : <strong>15%</strong> de chaque vente</li>
                  </ul>
                )}
              </div>
            </div>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Photo */}
          <Card className="p-6 border-0 shadow-sm">
            <Label className="text-base font-semibold mb-4 block">
              Photo du panier <span className="text-rose-500">*</span>
            </Label>
            <div className="flex items-center gap-4">
              {formData.photo_url ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden">
                  <img
                    src={formData.photo_url}
                    alt="Panier"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, photo_url: '' }))}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500">Ajouter</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Ajoutez une photo attractive de votre panier. <span className="font-semibold text-gray-900">La photo est obligatoire</span> pour prouver la véracité de ce que vous vendez.
                </p>
              </div>
            </div>
          </Card>

          {/* Basic Info */}
          <Card className="p-6 border-0 shadow-sm space-y-6">
            <div>
              <Label htmlFor="title" className="text-base font-semibold">
                Titre du panier <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Panier de fruits frais"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-base font-semibold">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description" className="text-base font-semibold">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez le contenu de votre panier..."
                className="mt-2"
                rows={4}
              />
            </div>

            {/* Validation feedback */}
            {validationState.isValidating && (
              <Card className="p-4 border-0 shadow-sm bg-blue-50 border-l-4 border-blue-500">
                <div className="flex items-center gap-2 text-blue-700">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Vérification du produit...</span>
                </div>
              </Card>
            )}

            {validationState.result && !validationState.result.valid && (
              <Card className="p-4 border-0 shadow-sm bg-rose-50 border-l-4 border-rose-500">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-rose-900">{validationState.result.message}</h4>
                    {validationState.result.suggestion && (
                      <p className="text-sm text-rose-800 mt-1">{validationState.result.suggestion}</p>
                    )}
                    {validationState.result.matches && validationState.result.matches.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {validationState.result.matches.map((match, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {match}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {validationState.result && validationState.result.valid && validationState.result.warnings && validationState.result.warnings.length > 0 && (
              <Card className="p-4 border-0 shadow-sm bg-amber-50 border-l-4 border-amber-500">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h4 className="font-semibold text-amber-900">Produit validé avec avertissements</h4>
                    {validationState.result.warnings.map((warning, idx) => (
                      <p key={idx} className="text-sm text-amber-800">{warning}</p>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            <div>
              <Label className="text-base font-semibold">Contenu du panier</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={contentItem}
                  onChange={(e) => setContentItem(e.target.value)}
                  placeholder="Ex: 2kg de pommes"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addContentItem())}
                />
                <Button type="button" variant="outline" onClick={addContentItem}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.contents.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.contents.map((item, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1.5">
                      {item}
                      <button
                        type="button"
                        onClick={() => removeContentItem(index)}
                        className="ml-2 hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Donation Toggle */}
          <Card className="p-4 border-0 shadow-sm mb-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Mode de distribution</Label>
                <p className="text-sm text-gray-500">Choisir entre vente et don solidaire</p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_donation: false }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${!formData.is_donation
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  Vente
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is_donation: true, price: '0', original_price: '0' }))}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${formData.is_donation
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  Don
                </button>
              </div>
            </div>
          </Card>

          {/* Price */}
          {!formData.is_donation && (
            <Card className="p-6 border-0 shadow-sm">
              <Label className="text-base font-semibold mb-4 block">Prix</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="original_price" className="text-sm text-gray-500">
                    Valeur estimée {currentUser?.seller_type === 'commercant' && <span className="text-rose-500">*</span>}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="original_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.original_price}
                      onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                      placeholder="0.00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  </div>
                </div>
                <div>
                  <Label htmlFor="price" className="text-sm text-gray-500">
                    Prix de vente <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="0.00"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                  </div>
                </div>
              </div>
              {formData.original_price && formData.price && (
                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${currentUser?.seller_type === 'commercant' && (1 - formData.price / formData.original_price) * 100 < 60
                  ? 'bg-red-50 text-red-700'
                  : 'bg-emerald-50 text-emerald-700'
                  }`}>
                  <Info className="w-4 h-4" />
                  <span className="text-sm">
                    Réduction de {Math.round((1 - formData.price / formData.original_price) * 100)}%
                    {currentUser?.seller_type === 'commercant' && (1 - formData.price / formData.original_price) * 100 < 60 &&
                      ' - Minimum 60% requis pour les professionnels'
                    }
                  </span>
                </div>
              )}
              {currentUser?.seller_type === 'commercant' && formData.price && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Commission plateforme (25%)</span>
                    <span>-{(parseFloat(formData.price) * 0.25).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-700 pt-2 border-t mt-2">
                    <span>Net vendeur</span>
                    <span>{(parseFloat(formData.price) * 0.75).toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </Card>
          )}

          {formData.is_donation && (
            <Card className="p-6 border-0 shadow-sm bg-blue-50 border-l-4 border-blue-500">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-blue-900">Mode Don Activé</h4>
                  <p className="text-sm text-blue-800">
                    Ce panier sera proposé <strong>gratuitement</strong>. Merci pour votre générosité ! ❤️
                  </p>
                </div>
              </div>
            </Card>
          )}
          {currentUser?.seller_type !== 'commercant' && formData.price && (
            <div className="mt-3 p-3 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Commission :</strong> {(formData.price * 0.15).toFixed(2)}€ (15%)
              </p>
              <p className="text-sm text-amber-800 mt-1">
                <strong>Vous recevrez :</strong> {(formData.price * 0.85).toFixed(2)}€
              </p>
            </div>
          )}

          {/* Pickup */}
          <Card className="p-6 border-0 shadow-sm space-y-6">
            <div>
              <Label className="text-base font-semibold">
                Adresse de retrait <span className="text-rose-500">*</span>
              </Label>
              <div className="mt-2">
                <LocationPicker
                  onLocationChange={handleLocationChange}
                  initialAddress={formData.pickup_address}
                  initialLat={formData.pickup_latitude}
                  initialLng={formData.pickup_longitude}
                  placeholder="Entrez l'adresse de retrait..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pickup_date" className="text-base font-semibold">
                Date de retrait <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pickup_date"
                type="date"
                value={formData.pickup_date}
                onChange={(e) => setFormData(prev => ({ ...prev, pickup_date: e.target.value }))}
                className="mt-2"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_time_start" className="text-sm text-gray-500">
                  Heure de début
                </Label>
                <Input
                  id="pickup_time_start"
                  type="time"
                  value={formData.pickup_time_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickup_time_start: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="pickup_time_end" className="text-sm text-gray-500">
                  Heure de fin
                </Label>
                <Input
                  id="pickup_time_end"
                  type="time"
                  value={formData.pickup_time_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, pickup_time_end: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editId ? 'Enregistrer les modifications' : 'Publier le panier'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}