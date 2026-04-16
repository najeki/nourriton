import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const statusColors = {
  upcoming: '#10b981',
  ongoing: '#3b82f6',
  completed: '#6b7280',
  cancelled: '#ef4444'
};

const statusLabels = {
  upcoming: 'À venir',
  ongoing: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée'
};

const createColoredIcon = (status) => {
  const color = statusColors[status];
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

export default function MaraudesMap({ maraudes, userLocation, onParticipate }) {
  const center = userLocation 
    ? [userLocation.latitude, userLocation.longitude] 
    : [48.8566, 2.3522]; // Paris par défaut

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      style={{ height: '100%', width: '100%' }}
      className="rounded-2xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {userLocation && (
        <Marker 
          position={[userLocation.latitude, userLocation.longitude]}
          icon={L.divIcon({
            html: '<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Vous êtes ici</p>
            </div>
          </Popup>
        </Marker>
      )}

      {maraudes.map(maraude => (
        maraude.departure_latitude && maraude.departure_longitude && (
          <Marker
            key={maraude.id}
            position={[maraude.departure_latitude, maraude.departure_longitude]}
            icon={createColoredIcon(maraude.status)}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <h3 className="font-semibold text-gray-900 mb-2">{maraude.title}</h3>
                
                <Badge className="mb-3" style={{ backgroundColor: statusColors[maraude.status] }}>
                  {statusLabels[maraude.status]}
                </Badge>

                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-500" />
                    {format(new Date(maraude.date), "EEEE d MMMM", { locale: fr })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    {maraude.time}
                  </div>
                  {maraude.distance && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      {maraude.distance.toFixed(1)} km
                    </div>
                  )}
                  {maraude.max_participants && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      {maraude.current_participants || 0} / {maraude.max_participants}
                    </div>
                  )}
                </div>

                <Link to={createPageUrl('MaraudeDetail') + `?id=${maraude.id}`}>
                  <Button className="w-full bg-emerald-500 hover:bg-emerald-600" size="sm">
                    Voir les détails
                  </Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}