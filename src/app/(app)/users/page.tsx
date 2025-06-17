"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { ref, query, orderByChild, equalTo, get, limitToFirst, startAt, endAt } from "firebase/database";
import { db } from "@/lib/firebase";
import type { CustomUser } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link"; // For linking to chat page (future)
import { toast } from "@/hooks/use-toast";

export default function UsersPage() {
  const { customUserData: currentUserData } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CustomUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      // Search by username:
      const usernameQuery = query(
        ref(db, "usernames"), 
        orderByChild(searchTerm) // This is not how RTDB search works, it needs exact match or prefix with key.
                                 // Let's change to prefix search on usernames key if possible or exact.
                                 // For simplicity, we'll fetch users and filter client-side or do exact match.
                                 // A more robust solution involves indexing or a different database like Firestore.
      );

      // Alternative: Search for exact username match
      const usernameRef = ref(db, `usernames/${searchTerm.toLowerCase()}`);
      const usernameSnapshot = await get(usernameRef);
      let foundUsers: CustomUser[] = [];

      if (usernameSnapshot.exists()) {
        const uid = usernameSnapshot.val();
        const userRef = ref(db, `users/${uid}`);
        const userSnapshot = await get(userRef);
        if (userSnapshot.exists()) {
          foundUsers.push(userSnapshot.val() as CustomUser);
        }
      } else {
         // Fallback: prefix search (less efficient for RTDB at scale)
         // This is a simplified approach. For production, use a search service or Firestore.
        const usersRef = ref(db, "users");
        const allUsersSnapshot = await get(query(usersRef, orderByChild('username'), startAt(searchTerm.toLowerCase()), endAt(searchTerm.toLowerCase() + "\uf8ff"), limitToFirst(10)));
        if (allUsersSnapshot.exists()) {
            allUsersSnapshot.forEach(snap => {
                const userData = snap.val() as CustomUser;
                if(userData.username && userData.username.toLowerCase().startsWith(searchTerm.toLowerCase())) {
                     // Exclude current user from search results
                    if (currentUserData?.uid !== userData.uid) {
                        foundUsers.push(userData);
                    }
                }
            });
        }
      }
      
      setSearchResults(foundUsers.filter(u => u.uid !== currentUserData?.uid));

    } catch (error) {
      console.error("Error searching users:", error);
      toast({ title: "Search Failed", description: "Could not perform search.", variant: "destructive" });
      setSearchResults([]);
    } finally {
      setIsLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    // Optional: initial load of some users or based on a default criteria
    // For now, search is manual
  }, []);
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  };

  // Placeholder function for starting a chat
  const startChat = (user: CustomUser) => {
    toast({ title: "Start Chat", description: `Starting chat with @${user.username} (feature to be implemented).`});
    // router.push(`/chat/${chatId}`); // Future implementation
  };

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Find Users</CardTitle>
          <CardDescription>Search for other Ripple Chat users by their @username.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-2">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                type="search"
                placeholder="Enter @username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.replace(/^@/, ''))} // Allow typing @ but remove for search
                className="pl-10"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Searching..." : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-4">
            {isLoading && <p className="text-muted-foreground text-center">Searching users...</p>}
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
              <p className="text-muted-foreground text-center">No users found matching "@{searchTerm}".</p>
            )}
             {!isLoading && initialLoad && (
              <p className="text-muted-foreground text-center">Enter a username to search for users.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
