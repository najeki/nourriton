import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Messages() {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', currentUser?.id],
    queryFn: async () => {
      const buyerConvs = await base44.entities.Conversation.filter({ buyer_id: currentUser.id }, '-last_message_at');
      const sellerConvs = await base44.entities.Conversation.filter({ seller_id: currentUser.id }, '-last_message_at');
      return [...buyerConvs, ...sellerConvs];
    },
    enabled: !!currentUser?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConversation?.id],
    queryFn: () => base44.entities.Message.filter({ conversation_id: selectedConversation.id }, 'created_date'),
    enabled: !!selectedConversation?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        content,
        is_read: false
      });

      const isBuyer = selectedConversation.buyer_id === currentUser.id;
      await base44.entities.Conversation.update(selectedConversation.id, {
        last_message: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        [isBuyer ? 'unread_count_seller' : 'unread_count_buyer']: 
          (selectedConversation[isBuyer ? 'unread_count_seller' : 'unread_count_buyer'] || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      queryClient.invalidateQueries(['conversations']);
      setMessageText('');
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId) => {
      const conv = conversations.find(c => c.id === conversationId);
      if (!conv) return;

      const isBuyer = conv.buyer_id === currentUser.id;
      await base44.entities.Conversation.update(conversationId, {
        [isBuyer ? 'unread_count_buyer' : 'unread_count_seller']: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']);
    }
  });

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    markAsReadMutation.mutate(conv.id);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMessageMutation.mutate(messageText);
  };

  if (!selectedConversation) {
    return (
      <div className="pb-24 lg:pb-8 h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Messages</h1>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
          ) : conversations.length > 0 ? (
            <div className="grid gap-4">
              {conversations.map(conv => {
                const isBuyer = conv.buyer_id === currentUser?.id;
                const otherUser = isBuyer ? conv.seller_name : conv.buyer_name;
                const unreadCount = isBuyer ? conv.unread_count_buyer : conv.unread_count_seller;

                return (
                  <Card 
                    key={conv.id} 
                    className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700">
                          {otherUser?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900">{otherUser}</p>
                          {conv.last_message_at && (
                            <span className="text-xs text-gray-400">
                              {format(new Date(conv.last_message_at), "d MMM", { locale: fr })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mb-1">Re: {conv.basket_title}</p>
                        <p className="text-sm text-gray-600 truncate">{conv.last_message || 'Nouvelle conversation'}</p>
                      </div>

                      {unreadCount > 0 && (
                        <Badge className="bg-emerald-500 text-white">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="Aucune conversation"
              description="Vos conversations avec les vendeurs et acheteurs apparaîtront ici."
            />
          )}
        </div>
      </div>
    );
  }

  const isBuyer = selectedConversation.buyer_id === currentUser?.id;
  const otherUser = isBuyer ? selectedConversation.seller_name : selectedConversation.buyer_name;

  return (
    <div className="pb-24 lg:pb-8 h-screen flex flex-col">
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>

            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-emerald-100 text-emerald-700">
                {otherUser?.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="font-semibold text-gray-900">{otherUser}</p>
              <Link 
                to={createPageUrl('BasketDetail') + `?id=${selectedConversation.basket_id}`}
                className="text-sm text-emerald-600 hover:underline"
              >
                {selectedConversation.basket_title}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
        <div className="py-6 space-y-4">
          {messages.map(msg => {
            const isMe = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-md ${isMe ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-900'} rounded-2xl px-4 py-2.5`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-emerald-100' : 'text-gray-500'}`}>
                    {format(new Date(msg.created_date), "HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}