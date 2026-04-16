import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Lock } from "lucide-react";

export default function Legal() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Informations Légales</h1>

            <Tabs defaultValue="cgu" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="cgu" className="gap-2">
                        <FileText className="w-4 h-4" />
                        CGU
                    </TabsTrigger>
                    <TabsTrigger value="mentions" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Mentions Légales
                    </TabsTrigger>
                    <TabsTrigger value="confidentialite" className="gap-2">
                        <Lock className="w-4 h-4" />
                        Confidentialité
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="cgu">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conditions Générales d'Utilisation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-4 text-sm text-gray-600">
                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">1. Objet</h3>
                                        <p>Les présentes CGU ont pour objet de définir les modalités de mise à disposition des services du site Nourriton et les conditions d'utilisation du Service par l'Utilisateur.</p>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">2. Accès au service</h3>
                                        <p>Le Service est accessible gratuitement à tout Utilisateur disposant d'un accès à internet. Tous les coûts afférents à l'accès au Service sont exclusivement à la charge de l'Utilisateur.</p>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">3. Responsabilités</h3>
                                        <p>Nourriton agit en tant qu'intermédiaire technique. Nous ne sommes pas propriétaires des produits vendus ou donnés sur la plateforme. La responsabilité de la qualité et de la conformité des produits incombe exclusivement au Vendeur.</p>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">4. Transactions et Paiements</h3>
                                        <p>Les paiements sont sécurisés par Stripe. Pour les transactions payantes, les fonds sont cantonnés jusqu'à confirmation de la réception par l'acheteur.</p>
                                        <p>Une commission de fonctionnement est appliquée sur les transactions :</p>
                                        <ul className="list-disc pl-5 mt-2">
                                            <li>15% pour les vendeurs particuliers</li>
                                            <li>25% pour les vendeurs professionnels</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">5. Hygiène et Sécurité Alimentaire</h3>
                                        <p>Les Vendeurs s'engagent à respecter les règles d'hygiène et de sécurité alimentaire en vigueur. Les produits périmés ou impropres à la consommation sont strictement interdits.</p>
                                    </section>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="mentions">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mentions Légales</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 text-sm text-gray-600">
                                <section>
                                    <h3 className="font-semibold text-gray-900 mb-2">Éditeur du site</h3>
                                    <p>Nourriton</p>
                                    <p>SAS au capital de 1000€</p>
                                    <p>Siège social : [Adresse à compléter]</p>
                                    <p>RCS : [Numéro à compléter]</p>
                                    <p>Email : contact@nourriton.fr</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-gray-900 mb-2">Hébergement</h3>
                                    <p>Netlify Inc.</p>
                                    <p>2325 3rd Street, Suite 215</p>
                                    <p>San Francisco, California 94107</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-gray-900 mb-2">Directeur de la publication</h3>
                                    <p>[Nom du directeur]</p>
                                </section>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="confidentialite">
                    <Card>
                        <CardHeader>
                            <CardTitle>Politique de Confidentialité</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-4 text-sm text-gray-600">
                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">1. Collecte des données</h3>
                                        <p>Nous collectons les données suivantes :</p>
                                        <ul className="list-disc pl-5 mt-2">
                                            <li>Informations d'identité (Nom, Prénom)</li>
                                            <li>Coordonnées (Email, Téléphone pour les vendeurs)</li>
                                            <li>Données de localisation (pour la recherche de paniers)</li>
                                            <li>Données de transaction</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">2. Utilisation des données</h3>
                                        <p>Vos données sont utilisées pour :</p>
                                        <ul className="list-disc pl-5 mt-2">
                                            <li>La mise en relation entre acheteurs et vendeurs</li>
                                            <li>La gestion des paiements et des factures</li>
                                            <li>L'amélioration de nos services</li>
                                            <li>La lutte contre la fraude</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">3. Partage des données</h3>
                                        <p>Vos données peuvent être partagées avec :</p>
                                        <ul className="list-disc pl-5 mt-2">
                                            <li>Stripe (pour les paiements)</li>
                                            <li>Les autorités compétentes (sur réquisition judiciaire)</li>
                                        </ul>
                                        <p className="mt-2 font-medium">Nous ne vendons jamais vos données personnelles à des tiers.</p>
                                    </section>

                                    <section>
                                        <h3 className="font-semibold text-gray-900 mb-2">4. Vos droits</h3>
                                        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Vous pouvez exercer ce droit en nous contactant à contact@nourriton.fr.</p>
                                    </section>
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
