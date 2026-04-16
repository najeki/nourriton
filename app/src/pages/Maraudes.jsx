import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MaraudeCard from "@/components/maraudes/MaraudeCard";
import MaraudesMap from "@/components/maraudes/MaraudesMap";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Heart, 
  Plus, 
  Loader2, 
  MapIcon, 
  Grid3x3,
  Users,
  Locate,
  Filter
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Maraudes() {
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [filters, setFilters] = useState({
    status: 'upcoming',
    maxDistance: 20,
    date: 'all'
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: maraudes = [], isLoading } = useQuery({
    queryKey: ['maraudes'],
    queryFn: () => base44.entities.Maraude.list('-date', 50),
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ['myParticipations', currentUser?.id],
    queryFn: () => base44.entities.MaraudeParticipant.filter({ participant_id: currentUser.id }),
    enabled: !!currentUser?.id,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {}
      );
    }
  }, []);

  const getCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        toast.error('Impossible de récupérer votre position');
      }
    );
  };

  const participateMutation = useMutation({
    mutationFn: async ({ maraude, isParticipating }) => {
      if (isParticipating) {
        const participation = myParticipations.find(p => p.maraude_id === maraude.id);
        await base44.entities.MaraudeParticipant.delete(participation.id);
        await base44.entities.Maraude.update(maraude.id, {
          current_participants: Math.max(0, (maraude.current_participants || 0) - 1)
        });
      } else {
        await base44.entities.MaraudeParticipant.create({
          maraude_id: maraude.id,
          participant_id: currentUser.id,
          participant_name: currentUser.full_name
        });
        await base44.entities.Maraude.update(maraude.id, {
          current_participants: (maraude.current_participants || 0) + 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['maraudes']);
      queryClient.invalidateQueries(['myParticipations']);
      toast.success('Participation mise à jour');
    }
  });

  const filteredMaraudes = maraudes
    .map(maraude => {
      let distance = null;
      if (userLocation && maraude.departure_latitude && maraude.departure_longitude) {
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          maraude.departure_latitude,
          maraude.departure_longitude
        );
      }
      return { ...maraude, distance };
    })
    .filter(maraude => {
      if (filters.status !== 'all' && maraude.status !== filters.status) return false;
      if (userLocation && maraude.distance !== null && maraude.distance > filters.maxDistance) return false;
      if (filters.date !== 'all') {
        const maraudeDate = new Date(maraude.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        if (filters.date === 'today' && maraudeDate.toDateString() !== today.toDateString()) return false;
        if (filters.date === 'week' && (maraudeDate < today || maraudeDate > nextWeek)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return new Date(a.date) - new Date(b.date);
    });

  const handleParticipate = (maraude) => {
    const isParticipating = myParticipations.some(p => p.maraude_id === maraude.id);
    participateMutation.mutate({ maraude, isParticipating });
  };

  const FilterPanel = ({ mobile = false }) => (
    <div className={mobile ? "space-y-4 p-4" : "space-y-6"}>
      <div>
        <Label className="text-sm font-medium mb-2 block">Statut</Label>
        <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="ongoing">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium mb-2 block">Date</Label>
        <Select value={filters.date} onValueChange={(value) => setFilters(prev => ({ ...prev, date: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {userLocation && (
        <div>
          <Label className="text-sm font-medium mb-2 block">
            Distance maximale: {filters.maxDistance} km
          </Label>
          <Slider
            value={[filters.maxDistance]}
            onValueChange={([value]) => setFilters(prev => ({ ...prev, maxDistance: value }))}
            min={1}
            max={50}
            step={1}
            className="mt-2"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="pb-24 lg:pb-8">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-teal-500 via-emerald-600 to-green-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-300 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="text-center text-white mb-8">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">Solidarité locale</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              Maraudes solidaires
            </h1>
            <p className="text-lg lg:text-xl text-emerald-100 max-w-2xl mx-auto">
              Participez ou organisez des maraudes pour aider les personnes dans le besoin
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Link to={createPageUrl('CreateMaraude')}>
              <Button className="bg-white text-emerald-600 hover:bg-white/90 gap-2 h-12">
                <Plus className="w-5 h-5" />
                Organiser une maraude
              </Button>
            </Link>
            <Button
              onClick={getCurrentLocation}
              disabled={isLocating}
              variant="outline"
              className="border-white text-white hover:bg-white/10 h-12"
            >
              {isLocating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Locate className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Maraudes disponibles</h2>
            <p className="text-gray-500 mt-1">
              {filteredMaraudes.length} maraude{filteredMaraudes.length !== 1 ? 's' : ''} près de vous
            </p>
          </div>
          
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon">
                <Filter className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <h3 className="font-semibold text-lg mb-4">Filtres</h3>
              <FilterPanel mobile />
            </SheetContent>
          </Sheet>
        </div>

        <div className="lg:grid lg:grid-cols-4 lg:gap-8">
          {/* Desktop Filters */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-20">
              <h3 className="font-semibold text-lg mb-4">Filtres</h3>
              <FilterPanel />
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="grid" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="grid" className="gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  Liste
                </TabsTrigger>
                <TabsTrigger value="map" className="gap-2">
                  <MapIcon className="w-4 h-4" />
                  Carte
                </TabsTrigger>
              </TabsList>

              <TabsContent value="grid">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl overflow-hidden">
                        <Skeleton className="h-48" />
                        <div className="p-4 space-y-3">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredMaraudes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredMaraudes.map(maraude => (
                      <MaraudeCard 
                        key={maraude.id} 
                        maraude={maraude}
                        distance={maraude.distance}
                        onParticipate={handleParticipate}
                        isParticipating={myParticipations.some(p => p.maraude_id === maraude.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Aucune maraude disponible"
                    description="Soyez le premier à organiser une maraude solidaire dans votre quartier."
                    actionLabel="Organiser une maraude"
                    onAction={() => window.location.href = createPageUrl('CreateMaraude')}
                  />
                )}
              </TabsContent>

              <TabsContent value="map">
                <div className="h-[600px] rounded-2xl overflow-hidden">
                  <MaraudesMap 
                    maraudes={filteredMaraudes} 
                    userLocation={userLocation}
                    onParticipate={handleParticipate}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>
    </div>
  );
}