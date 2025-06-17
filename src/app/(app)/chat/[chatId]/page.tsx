
"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { ref, onValue, off, push, serverTimestamp, update, get, child, orderByChild, limitToLast, query as dbQuery, set, remove } from "firebase/database";
import type { Message, ChatMetadata, UserChatEntry, CustomUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, ArrowLeft, Bot, Trash2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { aiChatBot } from "@/ai/flows/ai-chat-bot"; 
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AI_ASSISTANT_ID = "ai_assistant";
const AI_ASSISTANT_NAME = "AI Assistant";
const AI_ASSISTANT_PHOTO_URL_FALLBACK = "/logo-ai.png"; 

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;
  const { currentUser, customUserData } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatMetadata, setChatMetadata] = useState<ChatMetadata | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<{ id: string; displayName: string | null; photoURL: string | null; username?: string | null} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    const nameParts = name.split(' ');
    if (nameParts.length > 1 && nameParts[nameParts.length -1]) {
      return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || "?";
  };

  useEffect(() => {
    if (selectedMessages.length === 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedMessages]);

  useEffect(() => {
    if (!chatId || !currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const chatMetadataRef = ref(db, `chats/${chatId}`);
    const messagesRef = dbQuery(ref(db, `chatMessages/${chatId}`), orderByChild('timestamp'), limitToLast(50));

    const onChatMetadataValue = onValue(chatMetadataRef, async (snapshot) => {
      if (snapshot.exists()) {
        const metadata = snapshot.val() as ChatMetadata;
        setChatMetadata(metadata);

        if (metadata.isAiChat) {
          setOtherParticipant({
            id: AI_ASSISTANT_ID,
            displayName: AI_ASSISTANT_NAME,
            photoURL: metadata.participantDetails[AI_ASSISTANT_ID]?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK,
          });
        } else {
          const otherUserId = metadata.participants.find(pId => pId !== currentUser.uid);
          if (otherUserId && metadata.participantDetails[otherUserId]) {
             setOtherParticipant({
                id: otherUserId,
                displayName: metadata.participantDetails[otherUserId].displayName || metadata.participantDetails[otherUserId].username || "User",
                photoURL: metadata.participantDetails[otherUserId].photoURL,
                username: metadata.participantDetails[otherUserId].username,
             });
          } else if (otherUserId) { 
            const userSnap = await get(child(ref(db, 'users'), otherUserId));
            if (userSnap.exists()) {
              const otherUserData = userSnap.val() as CustomUser;
               setOtherParticipant({
                id: otherUserData.uid,
                displayName: otherUserData.displayName || otherUserData.username || "User",
                photoURL: otherUserData.photoURL,
                username: otherUserData.username
              });
            } else {
               setOtherParticipant({ id: otherUserId, displayName: "User", photoURL: null, username: null });
            }
          } else {
            setOtherParticipant(null);
          }
        }
        if (currentUser?.uid && chatId) {
            const userChatRef = ref(db, `userChats/${currentUser.uid}/${chatId}/unreadMessages`);
            set(userChatRef, 0);
        }

      } else {
        if (currentUser && chatId === `${currentUser.uid}_${AI_ASSISTANT_ID}`) {
            const now = serverTimestamp();
            const aiPhoto = AI_ASSISTANT_PHOTO_URL_FALLBACK;
            const currentUserName = customUserData?.displayName || currentUser.displayName || (customUserData?.username ? `@${customUserData.username}`: `User ${currentUser.uid.substring(0,6)}`);
            const newAiChatMetadata: ChatMetadata = {
                id: chatId,
                participants: [currentUser.uid, AI_ASSISTANT_ID],
                participantUids: [currentUser.uid],
                isAiChat: true,
                createdAt: now,
                updatedAt: now,
                participantDetails: {
                    [currentUser.uid]: {
                        displayName: currentUserName,
                        photoURL: customUserData?.photoURL || currentUser.photoURL,
                        username: customUserData?.username,
                    },
                    [AI_ASSISTANT_ID]: {
                        displayName: AI_ASSISTANT_NAME,
                        photoURL: aiPhoto, 
                    }
                },
                lastMessageText: "Say hello to your AI Assistant!",
                lastMessageTimestamp: now,
                lastMessageSenderId: AI_ASSISTANT_ID
            };
             const currentUserChatEntryForAi: UserChatEntry = {
                chatId,
                otherParticipantId: AI_ASSISTANT_ID,
                otherParticipantDisplayName: AI_ASSISTANT_NAME,
                otherParticipantPhotoURL: aiPhoto,
                unreadMessages: 0,
                isAiChat: true,
                updatedAt: now,
                lastMessageText: "Say hello to your AI Assistant!",
                lastMessageTimestamp: now, 
                lastMessageSenderId: AI_ASSISTANT_ID
            };
            const updates: Record<string, any> = {};
            updates[`/chats/${chatId}`] = newAiChatMetadata;
            updates[`/userChats/${currentUser.uid}/${chatId}`] = currentUserChatEntryForAi;
            await update(ref(db), updates);
            // Note: No initial AI message is pushed here to chatMessages, user starts convo
        } else {
          toast({ title: "Chat not found", description: "This chat does not exist or you don't have access.", variant: "destructive" });
          router.push("/dashboard"); 
        }
      }
    });

    const onMessagesValue = onValue(messagesRef, (snapshot) => {
      const newMessages: Message[] = [];
      snapshot.forEach(childSnapshot => {
        newMessages.push({ id: childSnapshot.key!, ...childSnapshot.val() } as Message);
      });
      setMessages(newMessages);
      setIsLoading(false);
    });
    
    return () => {
      off(chatMetadataRef, 'value', onChatMetadataValue);
      off(messagesRef, 'value', onMessagesValue);
    };
  }, [chatId, currentUser, customUserData, router]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !customUserData || !chatMetadata) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage("");

    const senderName = customUserData?.displayName || currentUser.displayName || (customUserData?.username ? `@${customUserData.username}`: "User");

    const messageData: Message = {
      id: '', 
      chatId,
      senderId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      senderDisplayName: senderName,
      senderPhotoURL: customUserData?.photoURL || currentUser.photoURL || undefined,
    };

    try {
      const newMessageRef = push(ref(db, `chatMessages/${chatId}`));
      messageData.id = newMessageRef.key!;
      
      const updates: Record<string, any> = {};
      updates[`/chatMessages/${chatId}/${newMessageRef.key}`] = messageData;
      
      const currentTime = serverTimestamp();
      updates[`/chats/${chatId}/lastMessageText`] = messageText;
      updates[`/chats/${chatId}/lastMessageTimestamp`] = currentTime;
      updates[`/chats/${chatId}/lastMessageSenderId`] = currentUser.uid;
      updates[`/chats/${chatId}/updatedAt`] = currentTime;
      
      for (const pId of chatMetadata.participants) {
        if (pId !== AI_ASSISTANT_ID) { 
            updates[`/userChats/${pId}/${chatId}/lastMessageText`] = messageText;
            updates[`/userChats/${pId}/${chatId}/lastMessageTimestamp`] = currentTime;
            updates[`/userChats/${pId}/${chatId}/lastMessageSenderId`] = currentUser.uid;
            updates[`/userChats/${pId}/${chatId}/updatedAt`] = currentTime;
            updates[`/userChats/${pId}/${chatId}/isAiChat`] = chatMetadata.isAiChat;

            if (pId === currentUser.uid) {
                updates[`/userChats/${pId}/${chatId}/unreadMessages`] = 0;
            } else {
                const otherUserChatEntryRef = child(ref(db, 'userChats'), `${pId}/${chatId}/unreadMessages`);
                const snapshot = await get(otherUserChatEntryRef);
                let currentUnread = 0;
                if (snapshot.exists() && typeof snapshot.val() === 'number') {
                    currentUnread = snapshot.val();
                }
                updates[`/userChats/${pId}/${chatId}/unreadMessages`] = currentUnread + 1;
            }
        }
      }
      
      await update(ref(db), updates);

      if (chatMetadata.isAiChat) {
        const aiResponse = await aiChatBot({ message: messageText });
        const aiMessageData: Message = {
          id: '', 
          chatId,
          senderId: AI_ASSISTANT_ID,
          text: aiResponse.response,
          timestamp: serverTimestamp(),
          senderDisplayName: AI_ASSISTANT_NAME,
          senderPhotoURL: chatMetadata.participantDetails[AI_ASSISTANT_ID]?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK,
        };
        const newAiMessageRef = push(ref(db, `chatMessages/${chatId}`));
        aiMessageData.id = newAiMessageRef.key!;

        const aiUpdates: Record<string, any> = {};
        aiUpdates[`/chatMessages/${chatId}/${newAiMessageRef.key}`] = aiMessageData;
        
        const aiTime = serverTimestamp();
        aiUpdates[`/chats/${chatId}/lastMessageText`] = aiResponse.response;
        aiUpdates[`/chats/${chatId}/lastMessageTimestamp`] = aiTime;
        aiUpdates[`/chats/${chatId}/lastMessageSenderId`] = AI_ASSISTANT_ID;
        aiUpdates[`/chats/${chatId}/updatedAt`] = aiTime;
        
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/lastMessageText`] = aiResponse.response;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/lastMessageTimestamp`] = aiTime;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/lastMessageSenderId`] = AI_ASSISTANT_ID;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/updatedAt`] = aiTime;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/isAiChat`] = true;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/unreadMessages`] = 0; // AI message means current user saw it
        
        await update(ref(db), aiUpdates);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) ? prev.filter(id => id !== messageId) : [...prev, messageId]
    );
  };

  const handleDeleteSelectedMessages = async () => {
    if (!currentUser || selectedMessages.length === 0 || !chatMetadata) return;

    const updates: Record<string, any> = {};
    selectedMessages.forEach(msgId => {
      updates[`/chatMessages/${chatId}/${msgId}`] = null; // Mark for deletion
    });

    try {
      await update(ref(db), updates); // Perform deletions

      // After successful deletion, update chat metadata if necessary
      const remainingMessagesQuery = dbQuery(ref(db, `chatMessages/${chatId}`), orderByChild('timestamp'), limitToLast(1));
      const remainingMessagesSnapshot = await get(remainingMessagesQuery);
      
      const metadataUpdates: Record<string, any> = {};
      const currentTime = serverTimestamp();

      if (remainingMessagesSnapshot.exists()) {
        let newLastMessage: Message | null = null;
        remainingMessagesSnapshot.forEach(snap => { // Should only be one if messages exist
          newLastMessage = { id: snap.key!, ...snap.val() } as Message;
        });

        if (newLastMessage) {
          metadataUpdates[`/chats/${chatId}/lastMessageText`] = newLastMessage.text;
          metadataUpdates[`/chats/${chatId}/lastMessageTimestamp`] = newLastMessage.timestamp;
          metadataUpdates[`/chats/${chatId}/lastMessageSenderId`] = newLastMessage.senderId;
        
          chatMetadata.participants.forEach(pId => {
            if (pId !== AI_ASSISTANT_ID) {
                metadataUpdates[`/userChats/${pId}/${chatId}/lastMessageText`] = newLastMessage!.text;
                metadataUpdates[`/userChats/${pId}/${chatId}/lastMessageTimestamp`] = newLastMessage!.timestamp; // Use actual timestamp
                metadataUpdates[`/userChats/${pId}/${chatId}/lastMessageSenderId`] = newLastMessage!.senderId;
                metadataUpdates[`/userChats/${pId}/${chatId}/updatedAt`] = newLastMessage!.timestamp; // Use actual timestamp
            }
          });
        }
      } else {
        // No messages left
        metadataUpdates[`/chats/${chatId}/lastMessageText`] = "No messages yet.";
        metadataUpdates[`/chats/${chatId}/lastMessageTimestamp`] = currentTime;
        metadataUpdates[`/chats/${chatId}/lastMessageSenderId`] = null;

        chatMetadata.participants.forEach(pId => {
           if (pId !== AI_ASSISTANT_ID) {
            metadataUpdates[`/userChats/${pId}/${chatId}/lastMessageText`] = "No messages yet.";
            metadataUpdates[`/userChats/${pId}/${chatId}/lastMessageTimestamp`] = currentTime;
            metadataUpdates[`/userChats/${pId}/${chatId}/lastMessageSenderId`] = null;
            metadataUpdates[`/userChats/${pId}/${chatId}/updatedAt`] = currentTime;
           }
        });
      }
      metadataUpdates[`/chats/${chatId}/updatedAt`] = currentTime;
      await update(ref(db), metadataUpdates);

      toast({ title: "Messages Deleted", description: `${selectedMessages.length} message(s) deleted.` });
    } catch (error: any) {
      console.error("Error deleting messages or updating metadata:", error);
      toast({ title: "Deletion Error", description: `Could not delete messages. Details: ${error.message}`, variant: "destructive" });
    } finally {
      setSelectedMessages([]);
      setShowDeleteConfirm(false);
    }
  };

  const otherParticipantName = otherParticipant?.displayName || otherParticipant?.username || "User";
  const otherParticipantInitials = getInitials(otherParticipant?.displayName || otherParticipant?.username);
  const otherParticipantPhoto = otherParticipant?.photoURL;

  const pageTitle = chatMetadata?.isAiChat ? AI_ASSISTANT_NAME : (otherParticipantName || "Chat");

  if (isLoading) {
    return <div className="container mx-auto py-8 text-center">Loading chat...</div>;
  }

  if (!chatMetadata && !isLoading) {
     // If still loading, the above return handles it. If not loading and no metadata, it's likely an error or redirect is pending.
    return <div className="container mx-auto py-8 text-center">Preparing chat...</div>;
  }
  
  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height,4rem)-2rem)]"> {/* Adjust header height as needed */}
      <Card className="flex-grow flex flex-col shadow-lg">
        <CardHeader className="flex flex-row items-center space-x-4 p-3 border-b sticky top-0 bg-card z-10">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
            <ArrowLeft />
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipantPhoto || (chatMetadata?.isAiChat ? AI_ASSISTANT_PHOTO_URL_FALLBACK : undefined)} alt={otherParticipantName} data-ai-hint={chatMetadata?.isAiChat ? "bot avatar" : "user avatar"} />
            <AvatarFallback className="bg-primary text-primary-foreground">
                {chatMetadata?.isAiChat ? <Bot size={20}/> : otherParticipantInitials}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-xl font-headline text-primary">{pageTitle}</CardTitle>
        </CardHeader>
        
        <CardContent className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isCurrentUser = msg.senderId === currentUser?.uid;
            const isSelected = selectedMessages.includes(msg.id);
            const canSelect = isCurrentUser && !chatMetadata?.isAiChat && msg.senderId !== AI_ASSISTANT_ID;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
                onClick={canSelect ? () => toggleMessageSelection(msg.id) : undefined}
              >
                <div className={`flex items-end space-x-2 max-w-xs sm:max-w-md md:max-w-lg ${isCurrentUser ? "flex-row-reverse space-x-reverse" : ""}`}>
                   {!isCurrentUser && (
                    <Avatar className="h-8 w-8 self-start">
                      <AvatarImage src={msg.senderPhotoURL || (msg.senderId === AI_ASSISTANT_ID ? AI_ASSISTANT_PHOTO_URL_FALLBACK : undefined)} alt={msg.senderDisplayName || "Sender"} data-ai-hint={msg.senderId === AI_ASSISTANT_ID ? "bot avatar" : "user avatar"}/>
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {msg.senderId === AI_ASSISTANT_ID ? <Bot size={16}/> : getInitials(msg.senderDisplayName)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`p-3 rounded-xl ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    } ${canSelect ? 'cursor-pointer' : ''} ${isSelected ? (isCurrentUser ? 'bg-primary/70' : 'bg-muted/70 ring-2 ring-accent') : ''}`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-xs mt-1 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/70"} text-right`}>
                      {new Date(msg.timestamp as number).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </CardContent>

        {selectedMessages.length > 0 ? (
          <div className="p-3 border-t bg-card flex items-center justify-between sticky bottom-0">
            <Button variant="ghost" onClick={() => setSelectedMessages([])} className="text-muted-foreground">
                <XCircle className="mr-2 h-5 w-5" /> Cancel ({selectedMessages.length})
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="mr-2 h-5 w-5" /> Delete Selected
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex items-center space-x-2 sticky bottom-0">
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-grow"
              disabled={isSending || !chatMetadata}
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim() || !chatMetadata}>
              <Send />
            </Button>
          </form>
        )}
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Messages?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMessages.length} message(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedMessages} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
