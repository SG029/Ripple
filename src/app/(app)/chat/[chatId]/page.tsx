
"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { ref, onValue, off, push, serverTimestamp, update, get, child, orderByChild, limitToLast, query as dbQuery, set } from "firebase/database";
import type { Message, ChatMetadata, UserChatEntry, CustomUser } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, ArrowLeft, Bot, User as UserIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { aiChatBot } from "@/ai/flows/ai-chat-bot"; // Assuming this path
import Link from "next/link";

const AI_ASSISTANT_ID = "ai_assistant";
const AI_ASSISTANT_NAME = "AI Assistant";
const AI_ASSISTANT_PHOTO_URL_FALLBACK = ""; // You can set a placeholder or specific AI avatar URL

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

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return "?";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
                displayName: metadata.participantDetails[otherUserId].displayName,
                photoURL: metadata.participantDetails[otherUserId].photoURL,
                username: metadata.participantDetails[otherUserId].username,
             });
          } else if (otherUserId) { // Fallback if details not in chatMetadata (should not happen with new structure)
            const userSnap = await get(child(ref(db, 'users'), otherUserId));
            if (userSnap.exists()) {
              const otherUserData = userSnap.val() as CustomUser;
               setOtherParticipant({
                id: otherUserData.uid,
                displayName: otherUserData.displayName,
                photoURL: otherUserData.photoURL,
                username: otherUserData.username
              });
            }
          }
        }
         // Mark messages as read
        const userChatRef = ref(db, `userChats/${currentUser.uid}/${chatId}/unreadMessages`);
        set(userChatRef, 0);

      } else {
        // Chat might not exist yet, especially for AI. Let's create it if it's an AI chat.
        if (chatId === `${currentUser.uid}_${AI_ASSISTANT_ID}`) {
            const now = serverTimestamp();
            const aiPhoto = '/logo-ai.png'; // Or some other default AI avatar
            const newAiChatMetadata: ChatMetadata = {
                id: chatId,
                participants: [currentUser.uid, AI_ASSISTANT_ID],
                participantUids: [currentUser.uid],
                isAiChat: true,
                createdAt: now,
                updatedAt: now,
                participantDetails: {
                    [currentUser.uid]: {
                        displayName: customUserData?.displayName || currentUser.displayName,
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
                updatedAt: Date.now(),
                lastMessageText: "Say hello to your AI Assistant!",
                lastMessageTimestamp: Date.now(),
                lastMessageSenderId: AI_ASSISTANT_ID
            };
            const updates: Record<string, any> = {};
            updates[`/chats/${chatId}`] = newAiChatMetadata;
            updates[`/userChats/${currentUser.uid}/${chatId}`] = currentUserChatEntryForAi;
            await update(ref(db), updates);
            // onValue listener will pick this up
        } else {
          toast({ title: "Chat not found", description: "This chat does not exist or you don't have access.", variant: "destructive" });
          router.push("/dashboard"); // Redirect if chat not found and not an AI chat to be created
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
    if (!newMessage.trim() || !currentUser || !chatMetadata) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage("");

    const messageData: Message = {
      id: '', // Will be set by push
      chatId,
      senderId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      senderDisplayName: customUserData?.displayName || currentUser.displayName || "User",
      senderPhotoURL: customUserData?.photoURL || currentUser.photoURL || undefined,
    };

    try {
      const newMessageRef = push(ref(db, `chatMessages/${chatId}`));
      messageData.id = newMessageRef.key!;
      
      const updates: Record<string, any> = {};
      updates[`/chatMessages/${chatId}/${newMessageRef.key}`] = messageData;
      
      const lastMessageUpdate = {
          lastMessageText: messageText,
          lastMessageTimestamp: serverTimestamp(),
          lastMessageSenderId: currentUser.uid,
          updatedAt: serverTimestamp()
      };
      updates[`/chats/${chatId}/lastMessageText`] = messageText;
      updates[`/chats/${chatId}/lastMessageTimestamp`] = serverTimestamp();
      updates[`/chats/${chatId}/lastMessageSenderId`] = currentUser.uid;
      updates[`/chats/${chatId}/updatedAt`] = serverTimestamp();
      
      // Update userChats for both participants
      chatMetadata.participants.forEach(pId => {
        if (pId !== AI_ASSISTANT_ID) { // Don't create userChat for AI itself
            updates[`/userChats/${pId}/${chatId}/lastMessageText`] = messageText;
            updates[`/userChats/${pId}/${chatId}/lastMessageTimestamp`] = serverTimestamp();
            updates[`/userChats/${pId}/${chatId}/lastMessageSenderId`] = currentUser.uid;
            updates[`/userChats/${pId}/${chatId}/updatedAt`] = serverTimestamp();
            if (pId !== currentUser.uid) { // Increment unread for other user
                // This would require a transaction or cloud function for reliable increment
                // For simplicity, client-side update here, but can be inconsistent
            }
        }
      });
      
      await update(ref(db), updates);

      // If AI chat, get AI response
      if (chatMetadata.isAiChat) {
        const aiResponse = await aiChatBot({ message: messageText });
        const aiMessageData: Message = {
          id: '', // Will be set by push
          chatId,
          senderId: AI_ASSISTANT_ID,
          text: aiResponse.response,
          timestamp: serverTimestamp(),
          senderDisplayName: AI_ASSISTANT_NAME,
          senderPhotoURL: AI_ASSISTANT_PHOTO_URL_FALLBACK,
        };
        const newAiMessageRef = push(ref(db, `chatMessages/${chatId}`));
        aiMessageData.id = newAiMessageRef.key!;

        const aiUpdates: Record<string, any> = {};
        aiUpdates[`/chatMessages/${chatId}/${newAiMessageRef.key}`] = aiMessageData;
        
        aiUpdates[`/chats/${chatId}/lastMessageText`] = aiResponse.response;
        aiUpdates[`/chats/${chatId}/lastMessageTimestamp`] = serverTimestamp();
        aiUpdates[`/chats/${chatId}/lastMessageSenderId`] = AI_ASSISTANT_ID;
        aiUpdates[`/chats/${chatId}/updatedAt`] = serverTimestamp();
        
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/lastMessageText`] = aiResponse.response;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/lastMessageTimestamp`] = serverTimestamp();
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/lastMessageSenderId`] = AI_ASSISTANT_ID;
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/updatedAt`] = serverTimestamp();
        
        await update(ref(db), aiUpdates);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading && !chatMetadata) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height,10rem))]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }
  
  const currentParticipantPhoto = chatMetadata?.isAiChat 
      ? otherParticipant?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK 
      : otherParticipant?.photoURL;
  const currentParticipantName = chatMetadata?.isAiChat 
      ? AI_ASSISTANT_NAME 
      : otherParticipant?.displayName;


  return (
    <div className="h-[calc(100vh-var(--header-height,5rem)-2rem)] md:h-[calc(100vh-var(--header-height,5rem)-4rem)] flex flex-col">
      <Card className="shadow-lg flex-1 flex flex-col w-full max-w-5xl mx-auto">
        <CardHeader className="border-b">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarImage src={currentParticipantPhoto || undefined} alt={currentParticipantName || "User"} data-ai-hint="user avatar chat" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                {chatMetadata?.isAiChat ? <Bot size={20}/> : getInitials(currentParticipantName)}
                </AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="text-xl font-headline text-primary">
                {currentParticipantName || "Chat"}
                </CardTitle>
                {otherParticipant?.username && !chatMetadata?.isAiChat && (
                    <Link href={`/profile/${otherParticipant.id}`} className="text-xs text-muted-foreground hover:underline">
                        @{otherParticipant.username}
                    </Link>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 ${
                msg.senderId === currentUser?.uid ? "justify-end" : "justify-start"
              }`}
            >
              {msg.senderId !== currentUser?.uid && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.senderId === AI_ASSISTANT_ID ? (chatMetadata?.participantDetails[AI_ASSISTANT_ID]?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK) : otherParticipant?.photoURL || undefined} alt="Sender" data-ai-hint="chat partner avatar" />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {msg.senderId === AI_ASSISTANT_ID ? <Bot size={16}/> : getInitials(msg.senderDisplayName)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow ${
                  msg.senderId === currentUser?.uid
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.senderId === currentUser?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                  {new Date(msg.timestamp as number).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.senderId === currentUser?.uid && customUserData && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={customUserData.photoURL || undefined} alt={customUserData.displayName || ""} data-ai-hint="my avatar" />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {getInitials(customUserData.displayName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isSending && chatMetadata?.isAiChat && (
             <div className="flex items-end space-x-2 justify-start">
              <Avatar className="h-8 w-8">
                 <AvatarFallback className="bg-accent text-accent-foreground">AI</AvatarFallback>
              </Avatar>
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow bg-muted text-foreground rounded-bl-none">
                <p className="text-sm">AI is typing...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t p-4">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending || !chatMetadata}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim() || !chatMetadata}>
              <Send className="h-4 w-4 mr-0 sm:mr-2" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

