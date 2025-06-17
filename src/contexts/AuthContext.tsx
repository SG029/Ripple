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
        // Fetch custom user data from Realtime Database
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          setCustomUserData(snapshot.val() as CustomUser);
        } else {
          // User exists in Auth but not in DB (e.g., first Google Sign-In)
          // Or if user signed up but didn't complete profile
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
    
    const newUserData: CustomUser = {
      uid,
      email: currentUser?.email || null,
      displayName: displayName || currentUser?.displayName || "Anonymous",
      photoURL: photoURL || currentUser?.photoURL || `https://placehold.co/100x100.png?text=${displayName?.[0]?.toUpperCase() || 'A'}`,
      username,
    };

    try {
      // Check username availability again in a transaction-like manner (simplified here)
      const usernameSnapshot = await get(usernameRef);
      if (usernameSnapshot.exists() && usernameSnapshot.val() !== uid) {
        throw new Error("Username is already taken.");
      }

      const updates: Record<string, any> = {};
      updates[`/users/${uid}`] = newUserData;
      updates[`/usernames/${username}`] = uid;
      
      await update(ref(db), updates);
      setCustomUserData(newUserData);
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
          const newUsername = user.email?.split('@')[0] || `user${Date.now().toString().slice(-5)}`;
          // Check if this auto-generated username is available
          let finalUsername = newUsername;
          let usernameIsAvailable = await isUsernameAvailable(finalUsername);
          let attempts = 0;
          while(!usernameIsAvailable && attempts < 5) {
            finalUsername = `${newUsername}${Math.floor(Math.random()*100)}`;
            usernameIsAvailable = await isUsernameAvailable(finalUsername);
            attempts++;
          }
          if (!usernameIsAvailable) { // fallback if still not available
             finalUsername = `user${user.uid.slice(0,8)}`;
          }


          const newUserProfile: CustomUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL || `https://placehold.co/100x100.png?text=${user.displayName?.[0]?.toUpperCase() || 'U'}`,
            username: finalUsername,
          };
          await set(userRef, newUserProfile);
          await set(ref(db, `usernames/${finalUsername}`), user.uid);
          setCustomUserData(newUserProfile);
          toast({ title: "Signed in with Google", description: `Welcome, ${user.displayName}!` });
          router.push("/dashboard");
        } else {
           setCustomUserData(snapshot.val() as CustomUser);
           toast({ title: "Signed in with Google", description: `Welcome back, ${snapshot.val().displayName}!` });
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
    } catch (error: any) {
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
