import React from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, X } from "lucide-react";

const categories = [
  { value: "all", label: "Toutes catégories" },
  { value: "fruits_legumes", label: "Fruits & Légumes" },
  { value: "boulangerie", label: "Boulangerie" },
  { value: "epicerie", label: "Épicerie" },
  { value: "produits_frais", label: "Produits frais" },
  { value: "plats_prepares", label: "Plats préparés" },
  { value: "mixte", label: "Mixte" }
];

const sellerTypes = [
  { value: "all", label: "Tous les vendeurs" },
  { value: "particulier", label: "Particuliers" },
  { value: "commercant", label: "Commerçants" }
];

export default function BasketFilters({ filters, setFilters }) {
  const handleReset = () => {
    setFilters({
      category: 'all',
      sellerType: 'all',
      maxPrice: 50,
      maxDistance: 10
    });
  };

  const hasActiveFilters = 
    filters.category !== 'all' || 
    filters.sellerType !== 'all' || 
    filters.maxPrice !== 50 || 
    filters.maxDistance !== 10;

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Catégorie</label>
        <Select value={filters.category} onValueChange={(v) => setFilters({...filters, category: v})}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">Type de vendeur</label>
        <Select value={filters.sellerType} onValueChange={(v) => setFilters({...filters, sellerType: v})}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {sellerTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Prix maximum</label>
          <span className="text-sm font-semibold text-emerald-600">{filters.maxPrice}€</span>
        </div>
        <Slider
          value={[filters.maxPrice]}
          onValueChange={([v]) => setFilters({...filters, maxPrice: v})}
          max={50}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Distance maximum</label>
          <span className="text-sm font-semibold text-emerald-600">{filters.maxDistance} km</span>
        </div>
        <Slider
          value={[filters.maxDistance]}
          onValueChange={([v]) => setFilters({...filters, maxDistance: v})}
          max={50}
          min={1}
          step={1}
          className="w-full"
        />
      </div>

      {hasActiveFilters && (
        <Button 
          variant="outline" 
          onClick={handleReset}
          className="w-full"
        >
          <X className="w-4 h-4 mr-2" />
          Réinitialiser les filtres
        </Button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop filters */}
      <div className="hidden lg:block bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">Filtres</h3>
        <FilterContent />
      </div>

      {/* Mobile filter button */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {hasActiveFilters && (
                <span className="bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}