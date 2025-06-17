
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
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
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
            // Handle case where otherUserId might be undefined (e.g., corrupted chat)
            setOtherParticipant(null);
          }
        }
        if (currentUser?.uid && chatId) {
            const userChatRef = ref(db, `userChats/${currentUser.uid}/${chatId}/unreadMessages`);
            set(userChatRef, 0);
        }

      } else {
        if (chatId === `${currentUser.uid}_${AI_ASSISTANT_ID}`) {
            const now = serverTimestamp();
            const aiPhoto = AI_ASSISTANT_PHOTO_URL_FALLBACK;
            const newAiChatMetadata: ChatMetadata = {
                id: chatId,
                participants: [currentUser.uid, AI_ASSISTANT_ID],
                participantUids: [currentUser.uid],
                isAiChat: true,
                createdAt: now,
                updatedAt: now,
                participantDetails: {
                    [currentUser.uid]: {
                        displayName: customUserData?.displayName || currentUser.displayName || (customUserData?.username ? `@${customUserData.username}`: `User ${currentUser.uid.substring(0,6)}`),
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

    const messageData: Message = {
      id: '', 
      chatId,
      senderId: currentUser.uid,
      text: messageText,
      timestamp: serverTimestamp(),
      senderDisplayName: customUserData?.displayName || currentUser.displayName || (customUserData?.username ? `@${customUserData.username}`: "User"),
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
        aiUpdates[`/userChats/${currentUser.uid}/${chatId}/unreadMessages`] = 0;
        
        await update(ref(db), aiUpdates);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
      setNewMessage(messageText); 
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageSelectToggle = (messageId: string, senderId: string) => {
    if (senderId !== currentUser?.uid) return; // Only allow selecting own messages
    setSelectedMessages((prevSelected) =>
      prevSelected.includes(messageId)
        ? prevSelected.filter((id) => id !== messageId)
        : [...prevSelected, messageId]
    );
  };

  const handleCancelSelection = () => {
    setSelectedMessages([]);
  };

  const handleDeleteSelectedMessages = async () => {
    if (!currentUser || selectedMessages.length === 0 || !chatMetadata) return;

    const updates: Record<string, any> = {};
    selectedMessages.forEach(msgId => {
      updates[`/chatMessages/${chatId}/${msgId}`] = null; // Mark for deletion
    });

    try {
      await update(ref(db), updates);
      
      const remainingMessagesSnap = await get(dbQuery(ref(db, `chatMessages/${chatId}`), orderByChild('timestamp'), limitToLast(1)));
      let newLastMessage: Message | null = null;
      if (remainingMessagesSnap.exists()) {
        remainingMessagesSnap.forEach(snap => newLastMessage = {id: snap.key!, ...snap.val()} as Message);
      }

      const chatUpdates: Record<string, any> = {};
      const currentTime = serverTimestamp();

      if (newLastMessage) {
        chatUpdates[`/chats/${chatId}/lastMessageText`] = newLastMessage.text;
        chatUpdates[`/chats/${chatId}/lastMessageTimestamp`] = newLastMessage.timestamp;
        chatUpdates[`/chats/${chatId}/lastMessageSenderId`] = newLastMessage.senderId;
      } else {
        chatUpdates[`/chats/${chatId}/lastMessageText`] = "No messages yet.";
        chatUpdates[`/chats/${chatId}/lastMessageTimestamp`] = chatMetadata.createdAt; // or null
        chatUpdates[`/chats/${chatId}/lastMessageSenderId`] = null;
      }
      chatUpdates[`/chats/${chatId}/updatedAt`] = currentTime;

      for (const pId of chatMetadata.participants) {
        if (pId !== AI_ASSISTANT_ID) {
            if (newLastMessage) {
                chatUpdates[`/userChats/${pId}/${chatId}/lastMessageText`] = newLastMessage.text;
                chatUpdates[`/userChats/${pId}/${chatId}/lastMessageTimestamp`] = newLastMessage.timestamp; // This needs to be resolved value for sorting
                chatUpdates[`/userChats/${pId}/${chatId}/lastMessageSenderId`] = newLastMessage.senderId;
            } else {
                chatUpdates[`/userChats/${pId}/${chatId}/lastMessageText`] = "No messages yet.";
                chatUpdates[`/userChats/${pId}/${chatId}/lastMessageTimestamp`] = chatMetadata.createdAt;
                chatUpdates[`/userChats/${pId}/${chatId}/lastMessageSenderId`] = null;
            }
            chatUpdates[`/userChats/${pId}/${chatId}/updatedAt`] = currentTime; // Use server timestamp for sorting
        }
      }
      await update(ref(db), chatUpdates);

      toast({ title: "Messages Deleted", description: `${selectedMessages.length} message(s) deleted.` });
      setSelectedMessages([]);
    } catch (error) {
      console.error("Error deleting messages:", error);
      toast({ title: "Deletion Error", description: "Could not delete messages.", variant: "destructive" });
    } finally {
      setShowDeleteConfirm(false);
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
  
  const participantPhotoForHeader = chatMetadata?.isAiChat 
      ? chatMetadata?.participantDetails[AI_ASSISTANT_ID]?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK 
      : otherParticipant?.photoURL;

  const participantNameForHeader = chatMetadata?.isAiChat 
      ? AI_ASSISTANT_NAME 
      : otherParticipant?.displayName || otherParticipant?.username || "User";


  return (
    <div className="h-[calc(100vh-var(--header-height,5rem)-2rem)] md:h-[calc(100vh-var(--header-height,5rem)-4rem)] flex flex-col">
      <Card className="shadow-lg flex-1 flex flex-col w-full max-w-5xl mx-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 border-2 border-primary/50">
                    <AvatarImage src={participantPhotoForHeader || undefined} alt={participantNameForHeader || "avatar"} data-ai-hint="user avatar chat" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                    {chatMetadata?.isAiChat ? <Bot size={20}/> : getInitials(otherParticipant?.displayName || otherParticipant?.username)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-xl font-headline text-primary">
                    {participantNameForHeader}
                    </CardTitle>
                    {otherParticipant?.username && !chatMetadata?.isAiChat && (
                        <Link href={`/profile/${otherParticipant.id}`} className="text-xs text-muted-foreground hover:underline">
                            @{otherParticipant.username}
                        </Link>
                    )}
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end space-x-2 group ${
                msg.senderId === currentUser?.uid ? "justify-end" : "justify-start"
              } ${msg.senderId === currentUser?.uid ? 'cursor-pointer' : ''} ${selectedMessages.includes(msg.id) ? 'bg-primary/10 rounded-lg py-1 -my-1' : ''} `}
              onClick={() => msg.senderId === currentUser?.uid && handleMessageSelectToggle(msg.id, msg.senderId)}
            >
              {msg.senderId !== currentUser?.uid && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.senderId === AI_ASSISTANT_ID ? (chatMetadata?.participantDetails[AI_ASSISTANT_ID]?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK) : otherParticipant?.photoURL || undefined} alt={msg.senderDisplayName || "Sender"} data-ai-hint="chat partner avatar" />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                    {msg.senderId === AI_ASSISTANT_ID ? <Bot size={16}/> : getInitials(msg.senderDisplayName || (otherParticipant?.id === msg.senderId ? (otherParticipant?.displayName || otherParticipant?.username) : null))}
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow ${
                  msg.senderId === currentUser?.uid
                    ? selectedMessages.includes(msg.id) ? "bg-primary/80 text-primary-foreground rounded-br-none" : "bg-primary text-primary-foreground rounded-br-none"
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
          {isSending && chatMetadata?.isAiChat && messages.at(-1)?.senderId === currentUser?.uid && (
             <div className="flex items-end space-x-2 justify-start">
               <Avatar className="h-8 w-8">
                  <AvatarImage src={chatMetadata?.participantDetails[AI_ASSISTANT_ID]?.photoURL || AI_ASSISTANT_PHOTO_URL_FALLBACK} alt="AI Assistant" data-ai-hint="ai avatar" />
                  <AvatarFallback className="bg-accent text-accent-foreground"><Bot size={16}/></AvatarFallback>
               </Avatar>
              <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow bg-muted text-foreground rounded-bl-none">
                <p className="text-sm">AI is typing...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t p-4">
          {selectedMessages.length > 0 ? (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleCancelSelection} className="text-muted-foreground">
                <XCircle className="h-5 w-5 mr-2" />
                Cancel ({selectedMessages.length})
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-5 w-5 mr-2" />
                Delete
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Messages?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedMessages.length} selected message(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelectedMessages} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


    