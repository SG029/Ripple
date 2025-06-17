
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare } from "lucide-react";
import { useState } from "react";
import { ref, query, get, serverTimestamp, update, child } from "firebase/database";
import { db } from "@/lib/firebase";
import type { CustomUser, ChatMetadata, UserChatEntry } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { currentUser, customUserData: currentUserData } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CustomUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setInitialLoad(false);
      return;
    }
    setIsLoading(true);
    try {
      const usersRef = ref(db, "users");
      // This is a simplified client-side filter. For large user bases, use server-side search/indexing.
      const snapshot = await get(usersRef);
      const allUsers: CustomUser[] = [];
      if (snapshot.exists()) {
        snapshot.forEach(userSnap => {
          const userData = userSnap.val() as CustomUser;
          if (userData.uid !== currentUserData?.uid && 
              (userData.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
               userData.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))) {
            allUsers.push(userData);
          }
        });
      }
      setSearchResults(allUsers);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({ title: "Search Failed", description: "Could not perform search.", variant: "destructive" });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  const startChat = async (otherUser: CustomUser) => {
    if (!currentUser || !currentUserData) {
      toast({ title: "Error", description: "You must be logged in to start a chat.", variant: "destructive" });
      return;
    }
    if (currentUser.uid === otherUser.uid) {
      toast({ title: "Error", description: "You cannot start a chat with yourself.", variant: "destructive" });
      return;
    }

    const chatId = currentUser.uid < otherUser.uid ? `${currentUser.uid}_${otherUser.uid}` : `${otherUser.uid}_${currentUser.uid}`;

    try {
      const chatRef = ref(db, `chats/${chatId}`);
      const chatSnapshot = await get(chatRef);

      if (!chatSnapshot.exists()) {
        // Chat doesn't exist, create it
        const now = serverTimestamp();
        const newChatMetadata: ChatMetadata = {
          id: chatId,
          participants: [currentUser.uid, otherUser.uid].sort(),
          participantUids: [currentUser.uid, otherUser.uid].sort(),
          isAiChat: false,
          createdAt: now,
          updatedAt: now,
          participantDetails: {
            [currentUser.uid]: {
              displayName: currentUserData.displayName,
              photoURL: currentUserData.photoURL,
              username: currentUserData.username,
            },
            [otherUser.uid]: {
              displayName: otherUser.displayName,
              photoURL: otherUser.photoURL,
              username: otherUser.username,
            },
          },
        };

        const currentUserChatEntry: UserChatEntry = {
          chatId,
          otherParticipantId: otherUser.uid,
          otherParticipantDisplayName: otherUser.displayName,
          otherParticipantPhotoURL: otherUser.photoURL,
          otherParticipantUsername: otherUser.username,
          unreadMessages: 0,
          isAiChat: false,
          updatedAt: Date.now(), // Use client timestamp for immediate sorting, server will update
        };

        const otherUserChatEntry: UserChatEntry = {
          chatId,
          otherParticipantId: currentUser.uid,
          otherParticipantDisplayName: currentUserData.displayName,
          otherParticipantPhotoURL: currentUserData.photoURL,
          otherParticipantUsername: currentUserData.username,
          unreadMessages: 0,
          isAiChat: false,
          updatedAt: Date.now(),
        };
        
        const updates: Record<string, any> = {};
        updates[`/chats/${chatId}`] = newChatMetadata;
        updates[`/userChats/${currentUser.uid}/${chatId}`] = currentUserChatEntry;
        updates[`/userChats/${otherUser.uid}/${chatId}`] = otherUserChatEntry;

        await update(ref(db), updates);
      }
      // Navigate to the chat
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({ title: "Chat Error", description: "Could not start chat.", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Find Users</CardTitle>
          <CardDescription>Search for other Ripple Chat users by display name or @username.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Enter name or @username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Searching..." : <Search className="h-4 w-4 mr-0 sm:mr-2" />}
               <span className="hidden sm:inline">{isLoading ? "Searching..." : "Search"}</span>
            </Button>
          </div>

          <div className="space-y-4 min-h-[100px]">
            {isLoading && <p className="text-muted-foreground text-center pt-4">Searching users...</p>}
            {!isLoading && searchResults.length > 0 && (
              <ul className="space-y-3">
                {searchResults.map((user) => (
                  <li key={user.uid} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} data-ai-hint="user avatar" />
                        <AvatarFallback className="bg-primary text-primary-foreground">{getInitials(user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{user.displayName}</p>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startChat(user)}>
                      <MessageSquare className="h-4 w-4 mr-2" /> Chat
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {!isLoading && !initialLoad && searchResults.length === 0 && searchTerm.trim() !== "" && (
              <p className="text-muted-foreground text-center pt-4">No users found matching "{searchTerm}".</p>
            )}
             {!isLoading && initialLoad && (
              <p className="text-muted-foreground text-center pt-4">Enter a name or username to search for users.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
