import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LocationPicker from "@/components/common/LocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Heart } from "lucide-react";

export default function CreateMaraude() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    duration_hours: 2,
    departure_address: '',
    departure_latitude: null,
    departure_longitude: null,
    max_participants: ''
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Maraude.create({
        ...data,
        organizer_id: currentUser.id,
        organizer_name: currentUser.full_name,
        status: 'upcoming',
        current_participants: 0,
        max_participants: data.max_participants ? parseInt(data.max_participants) : null,
        duration_hours: parseFloat(data.duration_hours)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maraudes']);
      toast.success('Maraude créée avec succès !');
      navigate(createPageUrl('Maraudes'));
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    }
  });

  const handleLocationChange = (location) => {
    setFormData(prev => ({
      ...prev,
      departure_address: location.address,
      departure_latitude: location.latitude,
      departure_longitude: location.longitude
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.date || !formData.time || !formData.departure_address) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Organiser une maraude</h1>
              <p className="text-gray-500 mt-1">
                Créez une action solidaire dans votre quartier
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Informations générales */}
          <Card className="p-6 border-0 shadow-sm space-y-6">
            <div>
              <Label htmlFor="title" className="text-base font-semibold">
                Titre de la maraude <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Maraude solidaire du samedi"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-base font-semibold">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez l'objectif et le déroulement de la maraude..."
                className="mt-2"
                rows={4}
              />
            </div>
          </Card>

          {/* Date et horaires */}
          <Card className="p-6 border-0 shadow-sm space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="text-base font-semibold">
                  Date <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="mt-2"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="time" className="text-base font-semibold">
                  Heure de départ <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="duration" className="text-base font-semibold">
                Durée estimée (heures)
              </Label>
              <Input
                id="duration"
                type="number"
                step="0.5"
                min="0.5"
                value={formData.duration_hours}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                className="mt-2"
              />
            </div>
          </Card>

          {/* Lieu */}
          <Card className="p-6 border-0 shadow-sm space-y-6">
            <div>
              <Label className="text-base font-semibold">
                Lieu de départ <span className="text-rose-500">*</span>
              </Label>
              <div className="mt-2">
                <LocationPicker
                  onLocationChange={handleLocationChange}
                  initialAddress={formData.departure_address}
                  initialLat={formData.departure_latitude}
                  initialLng={formData.departure_longitude}
                  placeholder="Entrez l'adresse de départ..."
                />
              </div>
            </div>
          </Card>

          {/* Participants */}
          <Card className="p-6 border-0 shadow-sm">
            <div>
              <Label htmlFor="max_participants" className="text-base font-semibold">
                Nombre maximum de participants (optionnel)
              </Label>
              <Input
                id="max_participants"
                type="number"
                min="1"
                value={formData.max_participants}
                onChange={(e) => setFormData(prev => ({ ...prev, max_participants: e.target.value }))}
                placeholder="Laissez vide si illimité"
                className="mt-2"
              />
              <p className="text-sm text-gray-500 mt-2">
                Vous pouvez limiter le nombre de participants ou laisser ce champ vide pour un nombre illimité
              </p>
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
              Créer la maraude
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}