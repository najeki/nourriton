import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Clock, 
  Users, 
  Heart,
  Loader2,
  User
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusColors = {
  upcoming: "bg-emerald-100 text-emerald-700",
  ongoing: "bg-blue-100 text-blue-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700"
};

const statusLabels = {
  upcoming: "À venir",
  ongoing: "En cours",
  completed: "Terminée",
  cancelled: "Annulée"
};

export default function MaraudeDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const maraudeId = urlParams.get('id');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: maraude, isLoading } = useQuery({
    queryKey: ['maraude', maraudeId],
    queryFn: async () => {
      const maraudes = await base44.entities.Maraude.filter({ id: maraudeId });
      return maraudes[0];
    },
    enabled: !!maraudeId,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ['participants', maraudeId],
    queryFn: () => base44.entities.MaraudeParticipant.filter({ maraude_id: maraudeId }),
    enabled: !!maraudeId,
  });

  const isParticipating = participants.some(p => p.participant_id === currentUser?.id);
  const isOrganizer = currentUser?.id === maraude?.organizer_id;

  const participateMutation = useMutation({
    mutationFn: async () => {
      if (isParticipating) {
        const participation = participants.find(p => p.participant_id === currentUser.id);
        await base44.entities.MaraudeParticipant.delete(participation.id);
        await base44.entities.Maraude.update(maraudeId, {
          current_participants: Math.max(0, (maraude.current_participants || 0) - 1)
        });
      } else {
        await base44.entities.MaraudeParticipant.create({
          maraude_id: maraudeId,
          participant_id: currentUser.id,
          participant_name: currentUser.full_name
        });
        await base44.entities.Maraude.update(maraudeId, {
          current_participants: (maraude.current_participants || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maraude', maraudeId]);
      queryClient.invalidateQueries(['participants', maraudeId]);
      toast.success(isParticipating ? 'Participation annulée' : 'Participation confirmée !');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!maraude) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Maraude introuvable</h1>
        <p className="text-gray-500 mb-6">Cette maraude n'existe plus ou a été supprimée.</p>
        <Button onClick={() => navigate(createPageUrl('Maraudes'))}>
          Retour aux maraudes
        </Button>
      </div>
    );
  }

  const isFull = maraude.max_participants && maraude.current_participants >= maraude.max_participants;

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 mb-8 lg:mb-0">
            <Card className="p-8 border-0 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <Badge className={statusColors[maraude.status]}>
                  {statusLabels[maraude.status]}
                </Badge>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">{maraude.title}</h1>
              
              {maraude.description && (
                <p className="text-gray-600 leading-relaxed mb-8">{maraude.description}</p>
              )}

              {/* Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <Card className="p-4 bg-gray-50 border-0">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Date</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(maraude.date), "EEEE d MMMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gray-50 border-0">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Horaires</p>
                      <p className="text-sm text-gray-600">
                        {maraude.time} • {maraude.duration_hours}h
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-gray-50 border-0 sm:col-span-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Lieu de départ</p>
                      <p className="text-sm text-gray-600">{maraude.departure_address}</p>
                    </div>
                  </div>
                </Card>

                {maraude.max_participants && (
                  <Card className="p-4 bg-gray-50 border-0 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-emerald-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Participants</p>
                        <p className="text-sm text-gray-600">
                          {maraude.current_participants || 0} / {maraude.max_participants} inscrits
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Organizer */}
              <Card className="p-6 border-0 bg-emerald-50">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-emerald-200">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
                      {maraude.organizer_name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-emerald-700 font-medium">Organisé par</p>
                    <p className="font-semibold text-gray-900">{maraude.organizer_name}</p>
                  </div>
                </div>
              </Card>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {!isOrganizer && maraude.status === 'upcoming' && (
              <Card className="p-6 border-0 shadow-sm">
                <Button
                  onClick={() => participateMutation.mutate()}
                  disabled={participateMutation.isPending || (!isParticipating && isFull)}
                  className={`w-full h-14 text-lg gap-2 ${
                    isParticipating 
                      ? 'bg-gray-500 hover:bg-gray-600' 
                      : 'bg-emerald-500 hover:bg-emerald-600'
                  }`}
                >
                  {participateMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Heart className={`w-5 h-5 ${isParticipating ? 'fill-current' : ''}`} />
                      {isParticipating ? 'Se désinscrire' : isFull ? 'Complet' : 'Je participe'}
                    </>
                  )}
                </Button>
                {isFull && !isParticipating && (
                  <p className="text-sm text-gray-500 text-center mt-3">
                    Cette maraude a atteint sa capacité maximale
                  </p>
                )}
              </Card>
            )}

            {/* Participants List */}
            {participants.length > 0 && (
              <Card className="p-6 border-0 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  Participants ({participants.length})
                </h3>
                <div className="space-y-3">
                  {participants.slice(0, 5).map(participant => (
                    <div key={participant.id} className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                          {participant.participant_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700">{participant.participant_name}</span>
                    </div>
                  ))}
                  {participants.length > 5 && (
                    <p className="text-sm text-gray-500 pt-2">
                      +{participants.length - 5} autres participants
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}