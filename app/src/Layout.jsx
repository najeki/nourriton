import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  ShoppingBag, 
  PlusCircle, 
  User, 
  History, 
  Menu, 
  X, 
  LogOut,
  Shield,
  Leaf,
  MessageSquare,
  Heart,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Layout({ children, currentPageName }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const mainNavigation = [
    { name: 'Mes paniers', href: createPageUrl('MyBaskets'), icon: ShoppingBag },
    { name: 'Créer un panier', href: createPageUrl('CreateBasket'), icon: PlusCircle },
    { name: 'Maraudes', href: createPageUrl('Maraudes'), icon: Heart },
  ];

  const moreNavigation = [
    { name: 'Messages', href: createPageUrl('Messages'), icon: MessageSquare },
    { name: 'Favoris', href: createPageUrl('Favorites'), icon: Heart },
    { name: 'Historique', href: createPageUrl('Transactions'), icon: History },
    { name: 'Mon profil', href: createPageUrl('Profile'), icon: User },
  ];

  const mobileNavigation = [
    { name: 'Accueil', href: createPageUrl('Home'), icon: Home },
    { name: 'Mes paniers', href: createPageUrl('MyBaskets'), icon: ShoppingBag },
    { name: 'Créer un panier', href: createPageUrl('CreateBasket'), icon: PlusCircle },
    { name: 'Maraudes', href: createPageUrl('Maraudes'), icon: Heart },
    { name: 'Messages', href: createPageUrl('Messages'), icon: MessageSquare },
    { name: 'Favoris', href: createPageUrl('Favorites'), icon: Heart },
    { name: 'Historique', href: createPageUrl('Transactions'), icon: History },
    { name: 'Mon profil', href: createPageUrl('Profile'), icon: User },
  ];

  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  const NavLinks = ({ mobile = false }) => {
    if (mobile) {
      return (
        <div className="space-y-2">
          {mobileNavigation.map((item) => {
            const isActive = currentPageName === item.name.replace('Mes ', '').replace('Mon ', '').replace('Créer un ', 'Create');
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-base
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                {item.name}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              to={createPageUrl('Admin')}
              onClick={() => setIsOpen(false)}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-base
                ${currentPageName === 'Admin' 
                  ? 'bg-rose-50 text-rose-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <Shield className="w-5 h-5" />
              Administration
            </Link>
          )}
        </div>
      );
    }

    return (
      <div className="hidden lg:flex items-center gap-1">
        {mainNavigation.map((item) => {
          const isActive = currentPageName === item.name.replace('Mes ', '').replace('Mon ', '').replace('Créer un ', 'Create');
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm
                ${isActive 
                  ? 'bg-emerald-50 text-emerald-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
              {item.name}
            </Link>
          );
        })}
        
        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="px-4 py-2.5 gap-2 text-sm">
              <MoreVertical className="w-5 h-5" />
              Plus
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {moreNavigation.map((item) => (
              <DropdownMenuItem key={item.name} asChild>
                <Link to={item.href} className="flex items-center gap-3 cursor-pointer">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              </DropdownMenuItem>
            ))}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={createPageUrl('Admin')} className="flex items-center gap-3 cursor-pointer">
                    <Shield className="w-4 h-4" />
                    Administration
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl('Home')} className="flex items-center gap-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695d69568e165f665b4797af/ea39ead6d_C489062B-3D85-4F06-B02C-BE55EDB7D566.PNG" 
                alt="Nourriton"
                className="h-14"
              />
            </Link>

            {/* Desktop Navigation */}
            <NavLinks />

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-3">
                  <Link to={createPageUrl('Profile')}>
                    <Avatar className="w-9 h-9 border-2 border-emerald-100">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-medium">
                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Mobile Menu */}
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="w-6 h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-gray-100">
                      {user && (
                        <div className="flex items-center gap-3">
                          <Avatar className="w-12 h-12 border-2 border-emerald-100">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                              {user.full_name?.charAt(0) || user.email?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-900">{user.full_name || 'Utilisateur'}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <nav className="flex-1 p-4">
                      <NavLinks mobile />
                    </nav>
                    <div className="p-4 border-t border-gray-100">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start gap-3"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-5 h-5" />
                        Déconnexion
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-pb z-40">
        <div className="flex items-center justify-around py-2">
          {[
            { name: 'Accueil', href: createPageUrl('Home'), icon: Home },
            { name: 'Mes paniers', href: createPageUrl('MyBaskets'), icon: ShoppingBag },
            { name: 'Créer', href: createPageUrl('CreateBasket'), icon: PlusCircle },
            { name: 'Maraudes', href: createPageUrl('Maraudes'), icon: Heart },
            { name: 'Plus', icon: MoreVertical }
          ].map((item) => {
            const isActive = currentPageName === item.name || 
              (item.name === 'Mes paniers' && currentPageName === 'MyBaskets') ||
              (item.name === 'Créer' && currentPageName === 'CreateBasket') ||
              (item.name === 'Maraudes' && currentPageName === 'Maraudes') ||
              (item.name === 'Accueil' && currentPageName === 'Home');

            if (item.name === 'Plus') {
              return (
                <Sheet key={item.name}>
                  <SheetTrigger asChild>
                    <button className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-gray-400">
                      <item.icon className="w-6 h-6" />
                      <span className="text-[10px] font-medium">{item.name}</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-auto">
                    <div className="py-4 space-y-2">
                      {moreNavigation.map((navItem) => (
                        <Link
                          key={navItem.name}
                          to={navItem.href}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          <navItem.icon className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">{navItem.name}</span>
                        </Link>
                      ))}
                      {isAdmin && (
                        <Link
                          to={createPageUrl('Admin')}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all"
                        >
                          <Shield className="w-5 h-5 text-gray-600" />
                          <span className="font-medium text-gray-900">Administration</span>
                        </Link>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all
                  ${isActive 
                    ? 'text-emerald-600' 
                    : 'text-gray-400'}
                `}
              >
                <item.icon className={`w-6 h-6 ${isActive ? 'text-emerald-600' : ''}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <style>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}