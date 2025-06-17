"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { AtSign, User as UserIcon, Image as ImageIcon } from "lucide-react";

export default function ProfilePage() {
  const { customUserData, currentUser, updateUserProfile, isUsernameAvailable, loading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameAvailableText, setUsernameAvailableText] = useState<string | null>(null);


  useEffect(() => {
    if (customUserData) {
      setDisplayName(customUserData.displayName || "");
      setUsername(customUserData.username || "");
      setPhotoURL(customUserData.photoURL || "");
    } else if (currentUser) {
      setDisplayName(currentUser.displayName || "");
      setPhotoURL(currentUser.photoURL || "");
    }
  }, [customUserData, currentUser]);

  const handleUsernameChange = async (newUsername: string) => {
    setUsername(newUsername);
    setUsernameError(null);
    setUsernameAvailableText(null);
    if (newUsername.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }
    if (newUsername === customUserData?.username) {
        setUsernameAvailableText("This is your current username.");
        return;
    }
    const available = await isUsernameAvailable(newUsername);
    if (!available) {
      setUsernameError("Username is taken.");
    } else {
      setUsernameAvailableText("Username is available!");
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    setUsernameError(null);

    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      setIsLoading(false);
      return;
    }
    if (username !== customUserData?.username) {
        const available = await isUsernameAvailable(username);
        if (!available) {
          setUsernameError("This username is taken. Please choose another.");
          setIsLoading(false);
          return;
        }
    }

    try {
      await updateUserProfile(currentUser.uid, username, displayName, photoURL);
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      setIsEditing(false);
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };


  if (authLoading) {
    return <div className="container mx-auto py-8 text-center">Loading profile...</div>;
  }

  if (!currentUser) {
    return <div className="container mx-auto py-8 text-center">Please log in to view your profile.</div>;
  }
  
  const displayPhotoUrl = photoURL || `https://placehold.co/128x128.png?text=${getInitials(displayName)}`;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">Your Profile</CardTitle>
          <CardDescription>View and update your profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32 border-4 border-primary/50">
              <AvatarImage src={displayPhotoUrl} alt={displayName || "User Avatar"} data-ai-hint="user avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-4xl">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="flex items-center mb-1"><UserIcon className="w-4 h-4 mr-2 text-muted-foreground"/>Display Name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
              </div>
              <div>
                <Label htmlFor="username" className="flex items-center mb-1"><AtSign className="w-4 h-4 mr-2 text-muted-foreground"/>Username</Label>
                <Input id="username" value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="your_unique_username" />
                {usernameError && <p className="text-sm text-destructive mt-1">{usernameError}</p>}
                {usernameAvailableText && !usernameError && <p className="text-sm text-green-600 mt-1">{usernameAvailableText}</p>}
              </div>
              <div>
                <Label htmlFor="photoURL" className="flex items-center mb-1"><ImageIcon className="w-4 h-4 mr-2 text-muted-foreground"/>Photo URL</Label>
                <Input id="photoURL" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://example.com/your-avatar.png" />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>Cancel</Button>
                <Button type="submit" disabled={isLoading || !!usernameError}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Display Name</Label>
                <p className="text-lg font-semibold">{customUserData?.displayName || currentUser.displayName}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Username</Label>
                <p className="text-lg font-semibold">@{customUserData?.username || "Not set"}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-lg">{customUserData?.email || currentUser.email}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
