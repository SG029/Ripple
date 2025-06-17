
"use client";

import type { User as FirebaseUser } from "firebase/auth";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { ref, get, set, serverTimestamp, child, update } from "firebase/database";
import type { CustomUser } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  customUserData: CustomUser | null;
  loading: boolean;
  isUsernameAvailable: (username: string) => Promise<boolean>;
  updateUserProfile: (uid: string, username: string, displayName: string, photoURL?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [customUserData, setCustomUserData] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setCustomUserData(snapshot.val() as CustomUser);
        } else {
          setCustomUserData(null); 
        }
      } else {
        setCustomUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isUsernameAvailable = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) return false;
    const usernameRef = ref(db, `usernames/${username}`);
    const snapshot = await get(usernameRef);
    return !snapshot.exists();
  };
  
  const updateUserProfile = async (uid: string, username: string, displayName: string, photoURL?: string): Promise<void> => {
    const userRef = ref(db, `users/${uid}`);
    const usernameRef = ref(db, `usernames/${username}`);
    
    const currentAuthUserDisplayName = auth.currentUser?.displayName?.trim();
    // Use existing customUserData's username for fallback if available, otherwise the new username being set.
    const usernameForDisplayFallback = customUserData?.username || username;

    const effectiveDisplayName = 
      displayName?.trim() || 
      currentAuthUserDisplayName || 
      (usernameForDisplayFallback ? `@${usernameForDisplayFallback}` : `User ${uid.substring(0, 6)}`);

    const newUserData: CustomUser = {
      uid,
      email: currentUser?.email || null,
      displayName: effectiveDisplayName,
      photoURL: photoURL?.trim() || currentUser?.photoURL || `https://placehold.co/100x100.png?text=${effectiveDisplayName[0]?.toUpperCase() || 'X'}`,
      username,
    };

    try {
      const usernameSnapshot = await get(usernameRef);
      if (usernameSnapshot.exists() && usernameSnapshot.val() !== uid && username !== customUserData?.username) {
        throw new Error("Username is already taken.");
      }

      const updates: Record<string, any> = {};
      updates[`/users/${uid}`] = newUserData;
      
      // If username changed from existing customUserData, remove old username entry
      if (customUserData?.username && customUserData.username !== username) {
        updates[`/usernames/${customUserData.username}`] = null; 
      }
      updates[`/usernames/${username}`] = uid; // Set new username entry
      
      await update(ref(db), updates);
      setCustomUserData(newUserData); // Update local state
      if (auth.currentUser && auth.currentUser.displayName !== newUserData.displayName) {
         // await updateFirebaseProfile(auth.currentUser, { displayName: newUserData.displayName }); // Update Firebase Auth profile too
      }
      toast({ title: "Profile updated successfully!"});
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) {
          // New user via Google, create DB entry
          const googleDisplayName = user.displayName?.trim();
          const baseUsername = user.email?.split('@')[0]?.replace(/[^a-zA-Z0-9_]/g, '') || `user${Date.now().toString().slice(-5)}`;
          
          let finalUsername = baseUsername;
          let usernameIsAvailable = await isUsernameAvailable(finalUsername);
          let attempts = 0;
          while(!usernameIsAvailable && attempts < 5) {
            finalUsername = `${baseUsername}${Math.floor(Math.random()*1000)}`;
            usernameIsAvailable = await isUsernameAvailable(finalUsername);
            attempts++;
          }
          if (!usernameIsAvailable) { 
             finalUsername = `user_${user.uid.slice(0,8)}`;
          }

          const effectiveDisplayName = googleDisplayName || `@${finalUsername}` || `User ${user.uid.substring(0,6)}`;

          const newUserProfile: CustomUser = {
            uid: user.uid,
            email: user.email,
            displayName: effectiveDisplayName,
            photoURL: user.photoURL || `https://placehold.co/100x100.png?text=${effectiveDisplayName[0]?.toUpperCase() || 'X'}`,
            username: finalUsername,
          };
          await set(userRef, newUserProfile);
          await set(ref(db, `usernames/${finalUsername}`), user.uid);
          setCustomUserData(newUserProfile);
          toast({ title: "Signed in with Google", description: `Welcome, ${effectiveDisplayName}!` });
          router.push("/dashboard");
        } else {
           const existingCustomUserData = snapshot.val() as CustomUser;
           setCustomUserData(existingCustomUserData);
           toast({ title: "Signed in with Google", description: `Welcome back, ${existingCustomUserData.displayName || 'User'}!` });
           router.push("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      toast({ title: "Google Sign-In Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setCustomUserData(null);
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push("/login");
    } catch (error: any)      {
      console.error("Sign Out Error:", error);
      toast({ title: "Sign Out Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthContext.Provider value={{ currentUser, customUserData, loading, isUsernameAvailable, updateUserProfile, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
