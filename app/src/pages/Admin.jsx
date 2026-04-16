import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { 
  Users, 
  Flag, 
  ShoppingBag,
  Search,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  ArrowLeft,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: currentUser?.role === 'admin',
  });

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['adminReports'],
    queryFn: () => base44.entities.Report.list('-created_date'),
    enabled: currentUser?.role === 'admin',
  });

  const { data: baskets = [], isLoading: loadingBaskets } = useQuery({
    queryKey: ['adminBaskets'],
    queryFn: () => base44.entities.Basket.list('-created_date', 50),
    enabled: currentUser?.role === 'admin',
  });

  const { data: pendingVerifications = [] } = useQuery({
    queryKey: ['pendingVerifications'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.verification_status === 'pending');
    },
    enabled: currentUser?.role === 'admin',
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, status, notes }) => 
      base44.entities.Report.update(id, { 
        status, 
        admin_notes: notes 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminReports']);
      setSelectedReport(null);
      setAdminNotes('');
      toast.success('Signalement mis à jour');
    }
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ id, suspend }) => 
      base44.entities.User.update(id, { is_suspended: suspend }),
    onSuccess: (_, { suspend }) => {
      queryClient.invalidateQueries(['adminUsers']);
      toast.success(suspend ? 'Utilisateur suspendu' : 'Utilisateur réactivé');
    }
  });

  const deleteBasketMutation = useMutation({
    mutationFn: (id) => base44.entities.Basket.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminBaskets']);
      toast.success('Panier supprimé');
    }
  });

  const verificationMutation = useMutation({
    mutationFn: async ({ userId, status, notes }) => {
      await base44.entities.User.update(userId, {
        verification_status: status,
        verification_notes: notes || '',
        is_verified: status === 'approved'
      });
      
      // Send notification email
      await base44.functions.invoke('notifyVerificationStatus', {
        userId,
        status,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['adminUsers']);
      queryClient.invalidateQueries(['pendingVerifications']);
      toast.success('Statut de vérification mis à jour et notification envoyée');
    }
  });

  // Check if user is admin
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
        <p className="text-gray-500 mb-6">Vous n'avez pas les droits d'accès à cette page.</p>
        <Button onClick={() => navigate(createPageUrl('Home'))}>
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const reportStatusConfig = {
    pending: { label: 'En attente', color: 'bg-amber-100 text-amber-700' },
    investigating: { label: 'En cours', color: 'bg-blue-100 text-blue-700' },
    resolved: { label: 'Résolu', color: 'bg-emerald-100 text-emerald-700' },
    dismissed: { label: 'Rejeté', color: 'bg-gray-100 text-gray-700' },
  };

  const reportTypeLabels = {
    inappropriate_content: 'Contenu inapproprié',
    fraud: 'Fraude',
    no_show: 'Non-présentation',
    quality_issue: 'Problème de qualité',
    harassment: 'Harcèlement',
    other: 'Autre'
  };

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 mt-1">Gestion des utilisateurs, signalements et contenus</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                <p className="text-sm text-gray-500">Utilisateurs</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-xl">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingVerifications.length}</p>
                <p className="text-sm text-gray-500">Vérifications en attente</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <Flag className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {reports.filter(r => r.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-500">Signalements en attente</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{baskets.length}</p>
                <p className="text-sm text-gray-500">Paniers</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="verifications">
          <TabsList className="bg-gray-100 p-1 mb-6">
            <TabsTrigger value="verifications" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Vérifications
              {pendingVerifications.length > 0 && (
                <Badge className="bg-purple-500 text-white ml-1">
                  {pendingVerifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <Flag className="w-4 h-4" />
              Signalements
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="bg-rose-500 text-white ml-1">
                  {reports.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="baskets" className="gap-2">
              <ShoppingBag className="w-4 h-4" />
              Paniers
            </TabsTrigger>
          </TabsList>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            <Card className="border-0 shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-6">Demandes de vérification commerçant</h2>
              
              {pendingVerifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Aucune demande en attente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingVerifications.map(user => (
                    <Card key={user.id} className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-purple-100 text-purple-700">
                              {user.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                      </div>

                      {user.verification_documents && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">SIRET</p>
                              <p className="font-medium">{user.verification_documents.siret}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Nom commercial</p>
                              <p className="font-medium">{user.verification_documents.business_name}</p>
                            </div>
                          </div>
                          
                          {user.verification_documents.business_address && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Adresse professionnelle</p>
                              <p className="text-sm">{user.verification_documents.business_address}</p>
                            </div>
                          )}

                          {user.verification_documents.document_url && (
                            <div>
                              <a 
                                href={user.verification_documents.document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <FileText className="w-4 h-4" />
                                Voir le document justificatif
                              </a>
                            </div>
                          )}

                          {user.verification_documents.submitted_at && (
                            <p className="text-xs text-gray-500">
                              Soumis le {format(new Date(user.verification_documents.submitted_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            if (confirm('Approuver cette demande de vérification ?')) {
                              verificationMutation.mutate({ 
                                userId: user.id, 
                                status: 'approved',
                                notes: ''
                              });
                            }
                          }}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                          disabled={verificationMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approuver
                        </Button>
                        <Button
                          onClick={() => {
                            const notes = prompt('Motif du refus (sera visible par l\'utilisateur) :');
                            if (notes) {
                              verificationMutation.mutate({ 
                                userId: user.id, 
                                status: 'rejected',
                                notes
                              });
                            }
                          }}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          disabled={verificationMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Refuser
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Signalé par</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        {reportTypeLabels[report.type]}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {report.description}
                      </TableCell>
                      <TableCell>{report.reporter_name}</TableCell>
                      <TableCell>
                        {format(new Date(report.created_date), "d MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <Badge className={reportStatusConfig[report.status]?.color}>
                          {reportStatusConfig[report.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setAdminNotes(report.admin_notes || '');
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Aucun signalement
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur..."
                  className="pl-10"
                />
              </div>
            </div>

            <Card className="border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Inscription</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs">
                              {user.full_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {user.user_type === 'seller' ? 'Vendeur' : 
                           user.user_type === 'both' ? 'Vendeur/Acheteur' : 'Acheteur'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_date), "d MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {user.is_suspended ? (
                          <Badge className="bg-rose-100 text-rose-700">Suspendu</Badge>
                        ) : user.is_verified ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Vérifié</Badge>
                        ) : (
                          <Badge variant="secondary">Actif</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => navigate(createPageUrl('SellerProfile') + `?id=${user.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => suspendUserMutation.mutate({ 
                                id: user.id, 
                                suspend: !user.is_suspended 
                              })}
                              className={user.is_suspended ? 'text-emerald-600' : 'text-rose-600'}
                            >
                              {user.is_suspended ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Réactiver
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspendre
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Baskets Tab */}
          <TabsContent value="baskets">
            <Card className="border-0 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Panier</TableHead>
                    <TableHead>Vendeur</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baskets.map(basket => (
                    <TableRow key={basket.id}>
                      <TableCell className="font-medium">{basket.title}</TableCell>
                      <TableCell>{basket.seller_name}</TableCell>
                      <TableCell>{basket.price?.toFixed(2)}€</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{basket.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(basket.created_date), "d MMM yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(createPageUrl('BasketDetail') + `?id=${basket.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteBasketMutation.mutate(basket.id)}
                              className="text-rose-600"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail du signalement</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{reportTypeLabels[selectedReport.type]}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-700">{selectedReport.description}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Signalé par</p>
                <p className="font-medium">{selectedReport.reporter_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Statut</p>
                <Select
                  value={selectedReport.status}
                  onValueChange={(value) => setSelectedReport({ ...selectedReport, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="investigating">En cours d'investigation</SelectItem>
                    <SelectItem value="resolved">Résolu</SelectItem>
                    <SelectItem value="dismissed">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Notes admin</p>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajouter des notes..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => updateReportMutation.mutate({
                id: selectedReport.id,
                status: selectedReport.status,
                notes: adminNotes
              })}
              disabled={updateReportMutation.isPending}
            >
              {updateReportMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}