import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

export default function BasketsMap({ baskets, userLocation }) {
  const center = userLocation 
    ? [userLocation.latitude, userLocation.longitude]
    : [48.8566, 2.3522]; // Paris par défaut

  return (
    <MapContainer 
      center={center} 
      zoom={13} 
      style={{ height: '100%', width: '100%', borderRadius: '1rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* User location marker */}
      {userLocation && (
        <Marker position={[userLocation.latitude, userLocation.longitude]}>
          <Popup>Votre position</Popup>
        </Marker>
      )}

      {/* Basket markers */}
      {baskets.filter(b => b.pickup_latitude && b.pickup_longitude).map(basket => (
        <Marker 
          key={basket.id} 
          position={[basket.pickup_latitude, basket.pickup_longitude]}
        >
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold text-sm mb-1">{basket.title}</h3>
              <p className="text-lg font-bold text-emerald-600 mb-2">{basket.price?.toFixed(2)}€</p>
              <Badge variant="secondary" className="mb-2">
                {basket.seller_name}
              </Badge>
              <Link to={createPageUrl('BasketDetail') + `?id=${basket.id}`}>
                <Button size="sm" className="w-full mt-2">
                  Voir le panier
                </Button>
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}