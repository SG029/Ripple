"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { createUserWithEmailAndPassword, updateProfile as updateFirebaseProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { ref, set, get } from "firebase/database";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomUser } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, KeyRound, User as UserIcon, AtSign } from "lucide-react";

const signupSchema = z.object({
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters." })
    .max(20, { message: "Username must be at most 20 characters." })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const { signInWithGoogle, isUsernameAvailable: checkUsernameAvailability, updateUserProfile } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: "",
      username: "",
      email: "",
      password: "",
    },
  });

  const debouncedUsernameCheck = async (username: string) => {
    if (username.length >= 3) {
      setUsernameLoading(true);
      const available = await checkUsernameAvailability(username);
      setUsernameAvailable(available);
      if (!available) {
        form.setError("username", { type: "manual", message: "Username is already taken." });
      } else {
        form.clearErrors("username");
      }
      setUsernameLoading(false);
    } else {
      setUsernameAvailable(null);
      form.clearErrors("username");
    }
  };
  
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'username' && value.username) {
        debouncedUsernameCheck(value.username);
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);


  const onSubmit = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      if (!(await checkUsernameAvailability(data.username))) {
        form.setError("username", { type: "manual", message: "Username is already taken. Please choose another." });
        setIsLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await updateFirebaseProfile(user, { displayName: data.displayName });
      
      // Store custom user data in Realtime Database
      await updateUserProfile(user.uid, data.username, data.displayName);

      toast({ title: "Account Created!", description: "Welcome to Ripple Chat!" });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Signup error", error);
      toast({ title: "Signup Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      // Error handled in context
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl shadow-xl">
      <div className="text-center">
        <h1 className="text-3xl font-headline font-bold text-primary">Create your Ripple Account</h1>
        <p className="text-muted-foreground">Join the wave of conversations.</p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Display Name</FormLabel>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="Your Name" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Username</FormLabel>
                 <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="your_unique_username" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
                {usernameLoading && <p className="text-xs text-muted-foreground">Checking availability...</p>}
                {usernameAvailable === true && field.value.length >=3 && <p className="text-xs text-green-500">Username available!</p>}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Email</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground">Password</FormLabel>
                 <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10" />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading || usernameLoading || usernameAvailable === false}>
            {isLoading ? "Creating Account..." : "Sign Up"}
          </Button>
        </form>
      </Form>
       <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
        </div>
      </div>
      <Button variant="outline" className="w-full mt-4" onClick={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? "Processing..." : (
           <>
            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4"><path fill="currentColor" d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.84-4.06 1.84-4.81 0-8.6-3.89-8.6-8.72s3.8-8.72 8.6-8.72c2.63 0 4.51 1.05 5.54 2.03l1.63-1.55C18.01 2.62 15.47 2 12.48 2a9.96 9.96 0 0 0-9.96 9.96c0 5.41 4.44 9.96 9.96 9.96 3.36 0 5.77-1.14 7.7-3.03 2.04-2.04 2.4-4.81 2.4-7.27 0-.6-.05-1.18-.15-1.72H12.48z"></path></svg>
            Google
          </>
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
