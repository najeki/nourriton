import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Calendar, Users, Heart } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

export default function MaraudeCard({ maraude, distance, onParticipate, isParticipating }) {
  return (
    <Card className="group overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-0 shadow-sm">
      <div className="relative bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <div className="absolute top-4 right-4">
          <Badge className={statusColors[maraude.status]}>
            {statusLabels[maraude.status]}
          </Badge>
        </div>
        
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 pr-20">{maraude.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{maraude.description}</p>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span>{format(new Date(maraude.date), "EEEE d MMMM yyyy", { locale: fr })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>{maraude.time} • {maraude.duration_hours}h</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>
              {distance ? `${distance.toFixed(1)} km` : maraude.departure_address}
            </span>
          </div>
          {maraude.max_participants && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span>
                {maraude.current_participants || 0} / {maraude.max_participants} participants
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-500">
            Organisé par <span className="font-medium text-gray-900">{maraude.organizer_name}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={createPageUrl('MaraudeDetail') + `?id=${maraude.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Voir les détails
            </Button>
          </Link>
          {maraude.status === 'upcoming' && onParticipate && (
            <Button 
              onClick={() => onParticipate(maraude)}
              className={`flex-1 ${isParticipating ? 'bg-gray-500 hover:bg-gray-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              <Heart className={`w-4 h-4 mr-2 ${isParticipating ? 'fill-current' : ''}`} />
              {isParticipating ? 'Inscrit' : 'Je participe'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}